import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { CALL_STATUS } from '../../../enums/call';
import { DESTINATION_STATUS } from '../../../enums/destination';
import { OPERATOR_AVAILABILITY } from '../../../enums/operator';
import { socketHelper } from '../../../helpers/socketHelper';
import { Destination } from '../destination/destination.model';
import { OperatorProfile } from '../operator/operatorProfile.model';
import { Wallet } from '../wallet/wallet.model';
import { Call } from './call.model';
import { CallRating } from './callRating.model';
import toCsv from '../../../utils/toCsv';

const ACTIVE_STATUSES = [
  CALL_STATUS.REQUESTED,
  CALL_STATUS.ASSIGNED,
  CALL_STATUS.DIALING_CUSTOMER,
  CALL_STATUS.CUSTOMER_CONNECTED,
  CALL_STATUS.DIALING_DESTINATION,
  CALL_STATUS.DESTINATION_CONNECTED,
  CALL_STATUS.CONFERENCING,
];

const generateCallRef = () =>
  `C-${Date.now().toString().slice(-7)}${crypto
    .randomBytes(1)
    .toString('hex')
    .toUpperCase()}`;

const requestCall = async (
  customerId: string,
  payload: { destinationId: string; numberDialed: string }
) => {
  const destination = await Destination.findOne({
    _id: payload.destinationId,
    status: DESTINATION_STATUS.ACTIVE,
  });
  if (!destination) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Destination is not available');
  }

  const wallet = await Wallet.findOne({ userId: customerId });
  if (!wallet || wallet.balanceMinutes < 1) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Insufficient balance — please recharge first'
    );
  }

  const existingActive = await Call.findOne({
    customerId,
    status: { $in: ACTIVE_STATUSES },
  });
  if (existingActive) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'You already have an active call request'
    );
  }

  const call = await Call.create({
    callRef: generateCallRef(),
    customerId,
    destinationId: destination._id,
    numberDialed: payload.numberDialed,
    status: CALL_STATUS.REQUESTED,
    requestedAt: new Date(),
  });

  // Broadcast to every online operator — first to accept wins. There's no
  // server-side timeout/reassignment yet if nobody accepts; see the blueprint.
  const onlineOperators = await OperatorProfile.find({
    availabilityStatus: OPERATOR_AVAILABILITY.ONLINE,
  }).select('userId');
  socketHelper.emitToUsers(
    onlineOperators.map((o) => o.userId.toString()),
    'call:new',
    {
      id: call._id,
      callRef: call.callRef,
      destinationName: destination.name,
      numberDialed: call.numberDialed,
      requestedAt: call.requestedAt,
    }
  );

  return {
    call,
    estimatedCostPerMin: destination.customerRatePerMin,
    balanceMinutes: wallet.balanceMinutes,
  };
};

const cancelCall = async (customerId: string, callId: string) => {
  const call = await Call.findOne({ _id: callId, customerId });
  if (!call) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Call not found');
  }
  // Cancellable any time before the two legs are actually merged — after that,
  // a real 3-way call is live on the operator's phone and only they can end it
  // (End Call / Mark Failed). This also gives a customer a way out if the
  // operator goes silent mid-dial instead of getting stuck forever.
  const CANCELLABLE_STATUSES = [
    CALL_STATUS.REQUESTED,
    CALL_STATUS.ASSIGNED,
    CALL_STATUS.DIALING_CUSTOMER,
    CALL_STATUS.CUSTOMER_CONNECTED,
    CALL_STATUS.DIALING_DESTINATION,
    CALL_STATUS.DESTINATION_CONNECTED,
  ];
  if (!CANCELLABLE_STATUSES.includes(call.status)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Cannot cancel a call that is already ${call.status}`
    );
  }

  call.status = CALL_STATUS.CANCELLED;
  call.endedAt = new Date();
  await call.save();

  if (call.operatorId) {
    // The operator was locked to this call (marked busy on accept) — free
    // them back up since the customer just pulled the plug on it.
    await OperatorProfile.findOneAndUpdate(
      { userId: call.operatorId },
      { availabilityStatus: OPERATOR_AVAILABILITY.ONLINE }
    );
    socketHelper.emitToUser(call.operatorId.toString(), 'call:update', call);
  }
  socketHelper.emitToUser(customerId, 'call:update', call);

  return call;
};

const getCallById = async (userId: string, callId: string) => {
  const call = await Call.findById(callId).populate(
    'destinationId',
    'name prefix'
  );
  if (!call) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Call not found');
  }
  const isOwner =
    call.customerId.toString() === userId ||
    call.operatorId?.toString() === userId;
  if (!isOwner) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You don't have permission to view this call"
    );
  }
  return call;
};

const listCustomerCalls = async (
  customerId: string,
  query: { page?: number; limit?: number; status?: string; search?: string }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const filter: Record<string, unknown> = { customerId };
  if (query.status) filter.status = query.status;
  if (query.search) filter.numberDialed = { $regex: query.search, $options: 'i' };

  const [calls, total] = await Promise.all([
    Call.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('destinationId', 'name'),
    Call.countDocuments(filter),
  ]);

  return {
    calls,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const rateCall = async (
  customerId: string,
  callId: string,
  payload: { stars: number; tags?: string[]; comment?: string }
) => {
  const call = await Call.findOne({ _id: callId, customerId });
  if (!call) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Call not found');
  }
  if (call.status !== CALL_STATUS.COMPLETED) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Only completed calls can be rated'
    );
  }
  if (!call.operatorId) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'This call has no operator to rate');
  }

  const existing = await CallRating.findOne({ callId });
  if (existing) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'This call has already been rated'
    );
  }

  const rating = await CallRating.create({
    callId,
    customerId,
    operatorId: call.operatorId,
    stars: payload.stars,
    tags: payload.tags || [],
    comment: payload.comment,
  });

  const agg = await CallRating.aggregate([
    { $match: { operatorId: call.operatorId } },
    { $group: { _id: null, avg: { $avg: '$stars' } } },
  ]);
  await OperatorProfile.findOneAndUpdate(
    { userId: call.operatorId },
    { ratingAvg: Number((agg[0]?.avg ?? payload.stars).toFixed(2)) }
  );

  return rating;
};

const getCallStatsAdmin = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [completedToday, failedToday, avgDurationAgg] = await Promise.all([
    Call.countDocuments({
      status: CALL_STATUS.COMPLETED,
      endedAt: { $gte: startOfToday },
    }),
    Call.countDocuments({
      status: CALL_STATUS.FAILED,
      endedAt: { $gte: startOfToday },
    }),
    Call.aggregate([
      { $match: { status: CALL_STATUS.COMPLETED } },
      { $group: { _id: null, avg: { $avg: '$minutesUsed' } } },
    ]),
  ]);

  return {
    completedToday,
    failedToday,
    avgDurationMinutes: Number((avgDurationAgg[0]?.avg ?? 0).toFixed(1)),
  };
};

const buildCallFilterAdmin = (query: {
  search?: string;
  status?: CALL_STATUS;
  days?: number;
}) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { callRef: { $regex: query.search, $options: 'i' } },
      { numberDialed: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.days) {
    const since = new Date();
    since.setDate(since.getDate() - Number(query.days));
    filter.requestedAt = { $gte: since };
  }
  return filter;
};

const listCallsAdmin = async (query: {
  page?: number;
  limit?: number;
  search?: string;
  status?: CALL_STATUS;
  days?: number;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const filter = buildCallFilterAdmin(query);

  const [calls, total] = await Promise.all([
    Call.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId', 'name phone')
      .populate('operatorId', 'name phone')
      .populate('destinationId', 'name prefix'),
    Call.countDocuments(filter),
  ]);

  return {
    calls,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const CALL_EXPORT_ROW_CAP = 5000;

const exportCallsCsv = async (query: {
  search?: string;
  status?: CALL_STATUS;
  days?: number;
}) => {
  const filter = buildCallFilterAdmin(query);
  const calls = await Call.find(filter)
    .sort({ createdAt: -1 })
    .limit(CALL_EXPORT_ROW_CAP)
    .populate('customerId', 'name phone')
    .populate('operatorId', 'name phone')
    .populate('destinationId', 'name');

  const rows = calls.map((c) => ({
    callRef: c.callRef,
    customer: (c.customerId as unknown as { name?: string })?.name ?? '',
    operator: (c.operatorId as unknown as { name?: string })?.name ?? '',
    destination: (c.destinationId as unknown as { name?: string })?.name ?? '',
    numberDialed: c.numberDialed,
    status: c.status,
    minutesUsed: c.minutesUsed ?? '',
    costMoney: c.costMoney ?? '',
    requestedAt: c.requestedAt,
  }));

  return toCsv(rows, [
    { key: 'callRef', label: 'Call Ref' },
    { key: 'customer', label: 'Customer' },
    { key: 'operator', label: 'Operator' },
    { key: 'destination', label: 'Destination' },
    { key: 'numberDialed', label: 'Number Dialed' },
    { key: 'status', label: 'Status' },
    { key: 'minutesUsed', label: 'Minutes' },
    { key: 'costMoney', label: 'Charged (AED)' },
    { key: 'requestedAt', label: 'Date' },
  ]);
};

export const CallService = {
  requestCall,
  cancelCall,
  getCallById,
  listCustomerCalls,
  rateCall,
  getCallStatsAdmin,
  listCallsAdmin,
  exportCallsCsv,
};
