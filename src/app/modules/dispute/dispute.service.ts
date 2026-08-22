import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { DISPUTE_STATUS } from '../../../enums/dispute';
import { CALL_STATUS } from '../../../enums/call';
import { WALLET_TRANSACTION_TYPE } from '../../../enums/wallet';
import { Call } from '../call/call.model';
import { Wallet } from '../wallet/wallet.model';
import { WalletTransaction } from '../wallet/walletTransaction.model';
import { Dispute } from './dispute.model';

const generateDisputeRef = () =>
  `DP-${Date.now().toString().slice(-4)}${crypto
    .randomBytes(1)
    .toString('hex')
    .toUpperCase()}`;

// Called from the Call module's "Report a problem" endpoint
const createDispute = async (
  customerId: string,
  callId: string,
  reason: string
) => {
  const call = await Call.findOne({ _id: callId, customerId });
  if (!call) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Call not found');
  }
  if (![CALL_STATUS.COMPLETED, CALL_STATUS.FAILED].includes(call.status)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Only completed or failed calls can be reported'
    );
  }

  const existing = await Dispute.findOne({ callId });
  if (existing) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'This call has already been reported'
    );
  }

  return Dispute.create({
    disputeRef: generateDisputeRef(),
    callId: call._id,
    customerId,
    operatorId: call.operatorId,
    amount: call.costMoney ?? 0,
    reason,
  });
};

const listDisputes = async (query: {
  page?: number;
  limit?: number;
  status?: DISPUTE_STATUS;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const [disputes, total] = await Promise.all([
    Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId', 'name phone')
      .populate('operatorId', 'name phone')
      .populate('callId', 'callRef'),
    Dispute.countDocuments(filter),
  ]);

  return {
    disputes,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getDisputeStats = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total, resolvedMtd, refundTotal] = await Promise.all([
    Dispute.countDocuments({}),
    Dispute.countDocuments({
      status: DISPUTE_STATUS.RESOLVED,
      updatedAt: { $gte: startOfMonth },
    }),
    Dispute.aggregate([
      { $match: { status: DISPUTE_STATUS.RESOLVED, refundAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } },
    ]),
  ]);

  return {
    totalDisputes: total,
    resolvedMtd,
    refundTotal: refundTotal[0]?.total ?? 0,
  };
};

const getDispute = async (disputeId: string) => {
  const dispute = await Dispute.findById(disputeId)
    .populate('customerId', 'name phone')
    .populate('operatorId', 'name phone')
    .populate('callId');
  if (!dispute) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Dispute not found');
  }
  return dispute;
};

const resolveDispute = async (
  disputeId: string,
  adminId: string,
  payload: { refundAmount?: number; adminNote?: string }
) => {
  const dispute = await Dispute.findOne({
    _id: disputeId,
    status: DISPUTE_STATUS.OPEN,
  });
  if (!dispute) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Dispute not found or already closed');
  }

  const refundAmount = payload.refundAmount ?? 0;
  if (refundAmount > dispute.amount) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Refund cannot exceed the disputed amount'
    );
  }

  if (refundAmount > 0) {
    const call = await Call.findById(dispute.callId);
    // Refund minutes proportional to the money refunded — a full refund
    // returns every minute the call cost, a partial refund returns a share
    const refundMinutes =
      call?.minutesUsed && call.costMoney
        ? Math.round(call.minutesUsed * (refundAmount / call.costMoney))
        : 0;

    const wallet = await Wallet.findOneAndUpdate(
      { userId: dispute.customerId },
      { $inc: { balanceMinutes: refundMinutes } },
      { new: true }
    );

    if (wallet) {
      await WalletTransaction.create({
        userId: dispute.customerId,
        txRef: `TX-${Date.now()}-${dispute.disputeRef}`,
        type: WALLET_TRANSACTION_TYPE.REFUND,
        minutes: refundMinutes,
        amountMoney: refundAmount,
        relatedCallId: dispute.callId,
        balanceAfter: wallet.balanceMinutes,
      });
    }
  }

  return Dispute.findByIdAndUpdate(
    dispute._id,
    {
      status: DISPUTE_STATUS.RESOLVED,
      refundAmount,
      adminNote: payload.adminNote,
      resolvedBy: adminId,
    },
    { new: true }
  );
};

const rejectDispute = async (
  disputeId: string,
  adminId: string,
  adminNote?: string
) => {
  const dispute = await Dispute.findOneAndUpdate(
    { _id: disputeId, status: DISPUTE_STATUS.OPEN },
    { status: DISPUTE_STATUS.REJECTED, adminNote, resolvedBy: adminId },
    { new: true }
  );
  if (!dispute) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Dispute not found or already closed');
  }
  return dispute;
};

export const DisputeService = {
  createDispute,
  listDisputes,
  getDisputeStats,
  getDispute,
  resolveDispute,
  rejectDispute,
};
