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
    { $inc: { acceptedCount: 1 } }
  );
  await recomputeAcceptanceRate(operatorId);

  socketHelper.emitToUser(call.customerId.toString(), 'call:update', call);
  socketHelper.emitToUser(operatorId, 'call:update', call);
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

  return call;
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

  socketHelper.emitToUser(call.customerId.toString(), 'call:update', call);
  socketHelper.emitToUser(operatorId, 'call:update', call);
  return call;
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
    { $inc: { totalCalls: 1, totalEarnings: operatorEarnings } }
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

  socketHelper.emitToUser(call.customerId.toString(), 'call:update', call);
  socketHelper.emitToUser(operatorId, 'call:update', call);
  return call;
};

const getOperatorCall = async (operatorId: string, callId: string) => {
  const call = await Call.findOne({ _id: callId, operatorId }).populate(
    'destinationId',
    'name prefix'
  );
  if (!call) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Call not found');
  }
  return call;
};

const getHistory = async (
  operatorId: string,
  query: { page?: number; limit?: number; search?: string }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const filter: Record<string, unknown> = { operatorId };
  if (query.search) filter.numberDialed = { $regex: query.search, $options: 'i' };

  const [calls, total] = await Promise.all([
    Call.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId', 'name phone'),
    Call.countDocuments(filter),
  ]);

  return {
    calls,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getEarnings = async (operatorId: string) => {
  const profile = await OperatorProfile.findOne({ userId: operatorId });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Operator profile not found');
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const [today, thisWeek] = await Promise.all([
    Call.aggregate([
      { $match: { operatorId: profile.userId, status: CALL_STATUS.COMPLETED, endedAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$operatorEarnings' } } },
    ]),
    Call.aggregate([
      { $match: { operatorId: profile.userId, status: CALL_STATUS.COMPLETED, endedAt: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: '$operatorEarnings' } } },
    ]),
  ]);

  return {
    totalEarnings: profile.totalEarnings,
    today: today[0]?.total ?? 0,
    thisWeek: thisWeek[0]?.total ?? 0,
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
