import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { PAYOUT_METHOD, PAYOUT_STATUS } from '../../../enums/payout';
import { OperatorProfile } from '../operator/operatorProfile.model';
import { User } from '../user/user.model';
import { Payout } from './payout.model';
import toCsv from '../../../utils/toCsv';

const generatePayoutRef = () =>
  `PO-${Date.now().toString().slice(-4)}${crypto
    .randomBytes(1)
    .toString('hex')
    .toUpperCase()}`;

// Reserved by pending, approved, or already-paid requests — a rejected
// payout releases its amount straight back into what's available.
const RESERVED_STATUSES = [
  PAYOUT_STATUS.PENDING,
  PAYOUT_STATUS.APPROVED,
  PAYOUT_STATUS.PAID,
];

const getAvailableBalance = async (operatorId: string) => {
  const profile = await OperatorProfile.findOne({ userId: operatorId });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Operator profile not found');
  }

  const reserved = await Payout.aggregate([
    { $match: { operatorId: profile.userId, status: { $in: RESERVED_STATUSES } } },
    { $group: { _id: null, total: { $sum: '$amountMoney' } } },
  ]);

  const available = profile.totalEarnings - (reserved[0]?.total ?? 0);
  return Math.max(0, Number(available.toFixed(2)));
};

const requestPayout = async (
  operatorId: string,
  payload: {
    amountMoney: number;
    method: PAYOUT_METHOD;
    bankName?: string;
    accountNumber?: string;
  }
) => {
  if (payload.method === PAYOUT_METHOD.BANK && !payload.bankName) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Bank name is required for a bank payout'
    );
  }

  const available = await getAvailableBalance(operatorId);
  if (payload.amountMoney > available) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Amount exceeds available balance (AED ${available})`
    );
  }

  return Payout.create({
    payoutRef: generatePayoutRef(),
    operatorId,
    amountMoney: payload.amountMoney,
    method: payload.method,
    bankName: payload.bankName,
    accountNumber: payload.accountNumber,
  });
};

const getMyPayouts = async (
  operatorId: string,
  query: { page?: number; limit?: number }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const [payouts, total, available] = await Promise.all([
    Payout.find({ operatorId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payout.countDocuments({ operatorId }),
    getAvailableBalance(operatorId),
  ]);

  return {
    payouts,
    availableBalance: available,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const buildPayoutFilter = async (query: {
  status?: PAYOUT_STATUS;
  search?: string;
}) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  if (query.search) {
    const regex = { $regex: query.search, $options: 'i' };
    const matchingOperators = await User.find({ name: regex }).select('_id');
    filter.$or = [
      { payoutRef: regex },
      { operatorId: { $in: matchingOperators.map((o) => o._id) } },
    ];
  }
  return filter;
};

const listAllPayouts = async (query: {
  page?: number;
  limit?: number;
  status?: PAYOUT_STATUS;
  search?: string;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const filter = await buildPayoutFilter(query);

  const [payouts, total] = await Promise.all([
    Payout.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('operatorId', 'name phone'),
    Payout.countDocuments(filter),
  ]);

  return {
    payouts,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const EXPORT_ROW_CAP = 5000;

const exportPayoutsCsv = async (query: {
  status?: PAYOUT_STATUS;
  search?: string;
}) => {
  const filter = await buildPayoutFilter(query);
  const payouts = await Payout.find(filter)
    .sort({ createdAt: -1 })
    .limit(EXPORT_ROW_CAP)
    .populate('operatorId', 'name phone');

  const rows = payouts.map((p) => ({
    payoutRef: p.payoutRef,
    operator: (p.operatorId as unknown as { name?: string })?.name ?? '',
    phone: (p.operatorId as unknown as { phone?: string })?.phone ?? '',
    amountMoney: p.amountMoney,
    method: p.method,
    status: p.status,
    createdAt: p.createdAt,
  }));

  return toCsv(rows, [
    { key: 'payoutRef', label: 'Payout Ref' },
    { key: 'operator', label: 'Operator' },
    { key: 'phone', label: 'Phone' },
    { key: 'amountMoney', label: 'Amount (AED)' },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Date' },
  ]);
};

const getPayoutDetail = async (id: string) => {
  const payout = await Payout.findById(id).populate(
    'operatorId',
    'name phone'
  );
  if (!payout) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Payout not found');
  }
  return payout;
};

const getPayoutStats = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [pending, paidMtd, rejected] = await Promise.all([
    Payout.aggregate([
      { $match: { status: PAYOUT_STATUS.PENDING } },
      { $group: { _id: null, total: { $sum: '$amountMoney' }, count: { $sum: 1 } } },
    ]),
    Payout.aggregate([
      { $match: { status: PAYOUT_STATUS.PAID, paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amountMoney' } } },
    ]),
    Payout.aggregate([
      { $match: { status: PAYOUT_STATUS.REJECTED } },
      { $group: { _id: null, total: { $sum: '$amountMoney' } } },
    ]),
  ]);

  return {
    pending: { amount: pending[0]?.total ?? 0, count: pending[0]?.count ?? 0 },
    paidMtd: paidMtd[0]?.total ?? 0,
    rejected: rejected[0]?.total ?? 0,
  };
};

const approvePayout = async (payoutId: string, adminId: string) => {
  const payout = await Payout.findOneAndUpdate(
    { _id: payoutId, status: PAYOUT_STATUS.PENDING },
    { status: PAYOUT_STATUS.APPROVED, processedBy: adminId, approvedAt: new Date() },
    { new: true }
  );
  if (!payout) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Payout not found or is not pending'
    );
  }
  return payout;
};

const markPaid = async (payoutId: string, adminId: string) => {
  const payout = await Payout.findOneAndUpdate(
    { _id: payoutId, status: PAYOUT_STATUS.APPROVED },
    { status: PAYOUT_STATUS.PAID, processedBy: adminId, paidAt: new Date() },
    { new: true }
  );
  if (!payout) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Payout must be approved before it can be marked paid'
    );
  }
  return payout;
};

const rejectPayout = async (
  payoutId: string,
  adminId: string,
  reason: string
) => {
  const payout = await Payout.findOneAndUpdate(
    { _id: payoutId, status: { $in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.APPROVED] } },
    {
      status: PAYOUT_STATUS.REJECTED,
      rejectionReason: reason,
      processedBy: adminId,
    },
    { new: true }
  );
  if (!payout) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Payout not found or already processed'
    );
  }
  return payout;
};

export const PayoutService = {
  getAvailableBalance,
  requestPayout,
  getMyPayouts,
  listAllPayouts,
  exportPayoutsCsv,
  getPayoutDetail,
  getPayoutStats,
  approvePayout,
  markPaid,
  rejectPayout,
};
