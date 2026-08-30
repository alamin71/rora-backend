import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { CALL_FAILURE_REASON, CALL_STATUS } from '../../../enums/call';
import { OPERATOR_AVAILABILITY } from '../../../enums/operator';
import { WALLET_TRANSACTION_TYPE } from '../../../enums/wallet';
import { socketHelper } from '../../../helpers/socketHelper';
import { Call } from '../call/call.model';
import { ICall } from '../call/call.interface';
import { Destination } from '../destination/destination.model';
import { Wallet } from '../wallet/wallet.model';
import { WalletTransaction } from '../wallet/walletTransaction.model';
import { OperatorProfile } from './operatorProfile.model';

const setAvailability = async (
  operatorId: string,
  status: OPERATOR_AVAILABILITY
) => {
  const update: Record<string, unknown> = { availabilityStatus: status };
  if (status === OPERATOR_AVAILABILITY.ONLINE) {
    update.shiftStartedAt = new Date();
  }
  const profile = await OperatorProfile.findOneAndUpdate(
    { userId: operatorId },
    update,
    { new: true }
  );
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Operator profile not found');
  }
  return profile;
};

// Browsable list backing the "Live Queue" screen — every online operator sees
// the same unassigned requests; POST /accept below is what makes it race-safe.
const getQueue = async () => {
  return Call.find({ status: CALL_STATUS.REQUESTED })
    .sort({ requestedAt: 1 })
    .populate('customerId', 'name phone')
    .populate('destinationId', 'name');
};

const recomputeAcceptanceRate = async (operatorId: string) => {
  const profile = await OperatorProfile.findOne({ userId: operatorId });
  if (!profile) return;
  const total = profile.acceptedCount + profile.missedRequestsCount;
  const rate = total > 0 ? Number(((profile.acceptedCount / total) * 100).toFixed(1)) : 0;
  await OperatorProfile.findOneAndUpdate(
    { userId: operatorId },
    { acceptanceRatePercent: rate }
  );
};

// The operator app can't force-end a live cellular call — only the operator
// can hang up. What we *can* do is give it the customer's current balance
// and this destination's rate on every step update, so it can compute a
// live countdown locally and prompt the operator to end the call in time.
const attachBillingInfo = async (call: any) => {
  const customerId = call.customerId?._id ?? call.customerId;
  const destinationId = call.destinationId?._id ?? call.destinationId;
  const [wallet, destination] = await Promise.all([
    Wallet.findOne({ userId: customerId }).select('balanceMinutes'),
    Destination.findById(destinationId).select('customerRatePerMin'),
  ]);
  const plain = typeof call.toObject === 'function' ? call.toObject() : call;
  return {
    ...plain,
    customerBalanceMinutes: wallet?.balanceMinutes ?? 0,
    customerRatePerMin: destination?.customerRatePerMin ?? null,
  };
};

const acceptCall = async (operatorId: string, callId: string) => {
  // Atomic — only the first operator to hit this wins the race
  const call = await Call.findOneAndUpdate(
    { _id: callId, status: CALL_STATUS.REQUESTED },
    { status: CALL_STATUS.ASSIGNED, operatorId, acceptedAt: new Date() },
    { new: true }
  );
  if (!call) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'This call has already been taken by another operator'
    );
  }

  await OperatorProfile.findOneAndUpdate(
    { userId: operatorId },
    {
      $inc: { acceptedCount: 1 },
      availabilityStatus: OPERATOR_AVAILABILITY.BUSY,
    }
  );
  await recomputeAcceptanceRate(operatorId);

  const enrichedCall = await attachBillingInfo(call);
  socketHelper.emitToUser(call.customerId.toString(), 'call:update', enrichedCall);
  socketHelper.emitToUser(operatorId, 'call:update', enrichedCall);
  // Tell every other online operator's queue to drop this one
  const onlineOperators = await OperatorProfile.find({
    availabilityStatus: OPERATOR_AVAILABILITY.ONLINE,
    userId: { $ne: operatorId },
  }).select('userId');
  socketHelper.emitToUsers(
    onlineOperators.map((o) => o.userId.toString()),
    'call:taken',
    { id: call._id.toString() }
  );

  return enrichedCall;
};

const skipCall = async (operatorId: string) => {
  await OperatorProfile.findOneAndUpdate(
    { userId: operatorId },
    { $inc: { missedRequestsCount: 1 } }
  );
  await recomputeAcceptanceRate(operatorId);
};

type TimestampField = keyof Pick<
  ICall,
  | 'customerDialedAt'
  | 'customerConnectedAt'
  | 'destinationDialedAt'
  | 'destinationConnectedAt'
  | 'conferenceStartedAt'
>;

const transitionCall = async (
  operatorId: string,
  callId: string,
  fromStatuses: CALL_STATUS[],
  toStatus: CALL_STATUS,
  timestampField: TimestampField
) => {
  const call = await Call.findOne({ _id: callId, operatorId });
  if (!call) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'Call not found or not assigned to you'
    );
  }
  if (!fromStatuses.includes(call.status)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Cannot move from "${call.status}" to "${toStatus}"`
    );
  }

  call.status = toStatus;
  call[timestampField] = new Date();
  await call.save();

  const enrichedCall = await attachBillingInfo(call);
  socketHelper.emitToUser(call.customerId.toString(), 'call:update', enrichedCall);
  socketHelper.emitToUser(operatorId, 'call:update', enrichedCall);
  return enrichedCall;
};

// Destination (Eritrea/Sudan) is dialed first, then the customer (Egypt) —
// per the operator app's stage order.
const dialDestination = (operatorId: string, callId: string) =>
  transitionCall(
    operatorId,
    callId,
    [CALL_STATUS.ASSIGNED],
    CALL_STATUS.DIALING_DESTINATION,
    'destinationDialedAt'
  );

const destinationConnected = (operatorId: string, callId: string) =>
  transitionCall(
    operatorId,
    callId,
    [CALL_STATUS.DIALING_DESTINATION],
    CALL_STATUS.DESTINATION_CONNECTED,
    'destinationConnectedAt'
  );

const dialCustomer = (operatorId: string, callId: string) =>
  transitionCall(
    operatorId,
    callId,
    [CALL_STATUS.DESTINATION_CONNECTED],
    CALL_STATUS.DIALING_CUSTOMER,
    'customerDialedAt'
  );

const customerConnected = (operatorId: string, callId: string) =>
  transitionCall(
    operatorId,
    callId,
    [CALL_STATUS.DIALING_CUSTOMER],
    CALL_STATUS.CUSTOMER_CONNECTED,
    'customerConnectedAt'
  );

// Merging the two live legs — this is where the billing clock starts
const startConference = (operatorId: string, callId: string) =>
  transitionCall(
    operatorId,
    callId,
    [CALL_STATUS.CUSTOMER_CONNECTED],
    CALL_STATUS.CONFERENCING,
    'conferenceStartedAt'
  );

const endCall = async (
  operatorId: string,
  callId: string,
  operatorSimUsed?: string
) => {
  const call = await Call.findOne({ _id: callId, operatorId });
  if (!call) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'Call not found or not assigned to you'
    );
  }
  if (call.status !== CALL_STATUS.CONFERENCING) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Call must be in conference before it can be ended'
    );
  }

  const destination = await Destination.findById(call.destinationId);
  if (!destination) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Destination not found');
  }

  const endedAt = new Date();
  const conferenceStart = call.conferenceStartedAt as Date;
  const durationMs = endedAt.getTime() - conferenceStart.getTime();
  const minutesUsed = Math.max(1, Math.ceil(durationMs / 60000));
  const costMoney = Number((minutesUsed * destination.customerRatePerMin).toFixed(2));
  const operatorEarnings = Number(
    (minutesUsed * destination.operatorPayoutPerMin).toFixed(2)
  );

  call.status = CALL_STATUS.COMPLETED;
  call.endedAt = endedAt;
  call.minutesUsed = minutesUsed;
  call.costMoney = costMoney;
  call.operatorEarnings = operatorEarnings;
  if (operatorSimUsed) call.operatorSimUsed = operatorSimUsed;
  await call.save();

  // The call already happened in the real world — deduct what's owed, but
  // never push the ledger negative even if the balance ran short mid-call.
  const wallet = await Wallet.findOne({ userId: call.customerId });
  if (wallet) {
    const newBalance = Math.max(0, wallet.balanceMinutes - minutesUsed);
    const actuallyDeducted = wallet.balanceMinutes - newBalance;
    wallet.balanceMinutes = newBalance;
    await wallet.save();

    await WalletTransaction.create({
      userId: call.customerId,
      txRef: `TX-${Date.now()}-${call.callRef}`,
      type: WALLET_TRANSACTION_TYPE.CALL_DEDUCTION,
      minutes: -actuallyDeducted,
      amountMoney: costMoney,
      relatedCallId: call._id,
      balanceAfter: newBalance,
    });
  }

  await OperatorProfile.findOneAndUpdate(
    { userId: operatorId },
    {
      $inc: { totalCalls: 1, totalEarnings: operatorEarnings },
      availabilityStatus: OPERATOR_AVAILABILITY.ONLINE,
    }
  );

  socketHelper.emitToUser(call.customerId.toString(), 'call:update', call);
  socketHelper.emitToUser(operatorId, 'call:update', call);

  return call;
};

const markFailed = async (
  operatorId: string,
  callId: string,
  failureReason: CALL_FAILURE_REASON
) => {
  const call = await Call.findOne({ _id: callId, operatorId });
  if (!call) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'Call not found or not assigned to you'
    );
  }
  if ([CALL_STATUS.COMPLETED, CALL_STATUS.FAILED, CALL_STATUS.CANCELLED].includes(call.status)) {
    throw new AppError(StatusCodes.BAD_REQUEST, `Call is already ${call.status}`);
  }

  call.status = CALL_STATUS.FAILED;
  call.failureReason = failureReason;
  call.endedAt = new Date();
  await call.save();

  await OperatorProfile.findOneAndUpdate(
    { userId: operatorId },
    { availabilityStatus: OPERATOR_AVAILABILITY.ONLINE }
  );

  socketHelper.emitToUser(call.customerId.toString(), 'call:update', call);
  socketHelper.emitToUser(operatorId, 'call:update', call);
  return call;
};

// The one call this operator is currently on, if any — lets the app recover
// state after being closed/reopened mid-call, since an accepted call drops
// out of the queue and its id isn't known to a freshly-launched app.
const OPERATOR_ACTIVE_STATUSES = [
  CALL_STATUS.ASSIGNED,
  CALL_STATUS.DIALING_CUSTOMER,
  CALL_STATUS.CUSTOMER_CONNECTED,
  CALL_STATUS.DIALING_DESTINATION,
  CALL_STATUS.DESTINATION_CONNECTED,
  CALL_STATUS.CONFERENCING,
];

const getActiveCall = async (operatorId: string) => {
  const call = await Call.findOne({
    operatorId,
    status: { $in: OPERATOR_ACTIVE_STATUSES },
  })
    .populate('customerId', 'name phone')
    .populate('destinationId', 'name prefix');
  return call ? attachBillingInfo(call) : null;
};

const getOperatorCall = async (operatorId: string, callId: string) => {
  const call = await Call.findOne({ _id: callId, operatorId }).populate(
    'destinationId',
    'name prefix'
  );
  if (!call) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Call not found');
  }
  return attachBillingInfo(call);
};

// "Today" tab's boundary always starts fresh; "Weekly"/"Monthly" reuse the
// same Monday-start-week convention as the earnings trend for consistency.
const periodStartDate = (period?: string): Date | undefined => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (period === 'weekly') {
    const startOfWeek = new Date(startOfToday);
    const dayIndex = startOfWeek.getDay();
    startOfWeek.setDate(
      startOfWeek.getDate() - (dayIndex === 0 ? 6 : dayIndex - 1)
    );
    return startOfWeek;
  }
  if (period === 'monthly') {
    return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  }
  // Default / 'today'
  return startOfToday;
};

const getHistory = async (
  operatorId: string,
  query: { page?: number; limit?: number; search?: string; period?: string }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const filter: Record<string, unknown> = { operatorId };
  if (query.search) filter.numberDialed = { $regex: query.search, $options: 'i' };

  const since = periodStartDate(query.period);
  if (since) filter.createdAt = { $gte: since };

  const [calls, total, summary] = await Promise.all([
    Call.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId', 'name phone'),
    Call.countDocuments(filter),
    Call.aggregate([
      // aggregate() bypasses schema casting, unlike find()/countDocuments()
      // — operatorId has to be cast to ObjectId by hand or this matches nothing.
      {
        $match: {
          ...filter,
          operatorId: new mongoose.Types.ObjectId(operatorId),
          status: CALL_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$minutesUsed' },
          totalEarnings: { $sum: '$operatorEarnings' },
        },
      },
    ]),
  ]);

  return {
    calls,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    statictis: [
      { calls: total },
      { Minutes: summary[0]?.totalMinutes ?? 0 },
      { Earnings: `AED ${summary[0]?.totalEarnings ?? 0}` },
    ],
  };
};

const getEarnings = async (operatorId: string) => {
  const profile = await OperatorProfile.findOne({ userId: operatorId });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Operator profile not found');
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  // Monday-start week, to line up with the trend/call-volume chart below
  // (M T W T F S S) rather than a Sunday-start week.
  const startOfWeek = new Date(startOfToday);
  const dayIndex = startOfWeek.getDay(); // 0=Sun..6=Sat
  startOfWeek.setDate(startOfWeek.getDate() - (dayIndex === 0 ? 6 : dayIndex - 1));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const startOfMonth = new Date(
    startOfToday.getFullYear(),
    startOfToday.getMonth(),
    1
  );

  const sumEarningsSince = (since: Date) =>
    Call.aggregate([
      {
        $match: {
          operatorId: profile.userId,
          status: CALL_STATUS.COMPLETED,
          endedAt: { $gte: since },
        },
      },
      { $group: { _id: null, total: { $sum: '$operatorEarnings' } } },
    ]);

  const [today, thisWeek, thisMonth, weekCalls] = await Promise.all([
    sumEarningsSince(startOfToday),
    sumEarningsSince(startOfWeek),
    sumEarningsSince(startOfMonth),
    Call.find({
      operatorId: profile.userId,
      status: CALL_STATUS.COMPLETED,
      endedAt: { $gte: startOfWeek, $lt: endOfWeek },
    }).select('endedAt operatorEarnings'),
  ]);

  // Earnings trend + call volume for the current week, Monday through Sunday.
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const earningsByDay = new Array(7).fill(0);
  const callsByDay = new Array(7).fill(0);
  for (const call of weekCalls) {
    const jsDay = (call.endedAt as Date).getDay(); // 0=Sun..6=Sat
    const idx = jsDay === 0 ? 6 : jsDay - 1; // remap to Mon=0..Sun=6
    earningsByDay[idx] += call.operatorEarnings ?? 0;
    callsByDay[idx] += 1;
  }

  return {
    totalEarnings: profile.totalEarnings,
    today: today[0]?.total ?? 0,
    thisWeek: thisWeek[0]?.total ?? 0,
    thisMonth: thisMonth[0]?.total ?? 0,
    trend: DAY_LABELS.map((day, i) => ({
      day,
      earnings: Number(earningsByDay[i].toFixed(2)),
    })),
    callVolume: DAY_LABELS.map((day, i) => ({ day, calls: callsByDay[i] })),
  };
};

const getPerformance = async (operatorId: string) => {
  const profile = await OperatorProfile.findOne({ userId: operatorId });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Operator profile not found');
  }
  return {
    acceptanceRatePercent: profile.acceptanceRatePercent,
    avgResponseTimeSeconds: profile.avgResponseTimeSeconds,
    totalCalls: profile.totalCalls,
    missedRequestsCount: profile.missedRequestsCount,
  };
};

export const OperatorCallService = {
  setAvailability,
  getQueue,
  acceptCall,
  skipCall,
  getActiveCall,
  dialDestination,
  destinationConnected,
  dialCustomer,
  customerConnected,
  startConference,
  endCall,
  markFailed,
  getOperatorCall,
  getHistory,
  getEarnings,
  getPerformance,
};
