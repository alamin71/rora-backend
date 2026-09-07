import { model, Schema } from 'mongoose';
import { KYC_STATUS } from '../../../enums/kyc';
import { IKyc, KycModel } from './kyc.interface';

const kycSchema = new Schema<IKyc, KycModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documentUrl: {
      type: String,
      required: true,
    },
    selfieUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(KYC_STATUS),
      default: KYC_STATUS.PENDING,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
  },
  { timestamps: true }
);

kycSchema.index({ userId: 1, createdAt: -1 });
kycSchema.index({ status: 1 });

export const Kyc = model<IKyc, KycModel>('Kyc', kycSchema);
