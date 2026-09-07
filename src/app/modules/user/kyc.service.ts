import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { KYC_STATUS } from '../../../enums/kyc';
import { Kyc } from './kyc.model';

// A customer can resubmit after a rejection — one active (pending/approved)
// submission per user; a rejected one doesn't block resubmitting.
const submitKyc = async (
  userId: string,
  payload: { documentUrl: string; selfieUrl?: string }
) => {
  const existing = await Kyc.findOne({
    userId,
    status: { $in: [KYC_STATUS.PENDING, KYC_STATUS.APPROVED] },
  });
  if (existing) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `You already have a KYC submission that is ${existing.status}`
    );
  }

  return Kyc.create({
    userId,
    documentUrl: payload.documentUrl,
    selfieUrl: payload.selfieUrl,
    status: KYC_STATUS.PENDING,
  });
};

const getMyKyc = async (userId: string) => {
  return Kyc.findOne({ userId }).sort({ createdAt: -1 });
};

const listKycAdmin = async (query: {
  page?: number;
  limit?: number;
  status?: KYC_STATUS;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const [submissions, total] = await Promise.all([
    Kyc.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name phone'),
    Kyc.countDocuments(filter),
  ]);

  return {
    submissions,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getKycDetail = async (id: string) => {
  const submission = await Kyc.findById(id).populate('userId', 'name phone');
  if (!submission) {
    throw new AppError(StatusCodes.NOT_FOUND, 'KYC submission not found');
  }
  return submission;
};

const approveKyc = async (id: string, adminId: string) => {
  const submission = await Kyc.findOneAndUpdate(
    { _id: id, status: KYC_STATUS.PENDING },
    {
      status: KYC_STATUS.APPROVED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
    { new: true }
  );
  if (!submission) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'KYC submission not found or already reviewed'
    );
  }
  return submission;
};

const rejectKyc = async (id: string, adminId: string, reason: string) => {
  const submission = await Kyc.findOneAndUpdate(
    { _id: id, status: KYC_STATUS.PENDING },
    {
      status: KYC_STATUS.REJECTED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
    { new: true }
  );
  if (!submission) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'KYC submission not found or already reviewed'
    );
  }
  return submission;
};

export const KycService = {
  submitKyc,
  getMyKyc,
  listKycAdmin,
  getKycDetail,
  approveKyc,
  rejectKyc,
};
