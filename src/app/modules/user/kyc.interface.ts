import { Model, Types } from 'mongoose';
import { KYC_STATUS } from '../../../enums/kyc';

export type IKyc = {
  userId: Types.ObjectId;
  documentUrl: string;
  selfieUrl?: string;
  status: KYC_STATUS;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
};

export type KycModel = Model<IKyc>;
