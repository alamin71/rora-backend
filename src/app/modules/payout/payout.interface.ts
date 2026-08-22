import { Model, Types } from 'mongoose';
import { PAYOUT_METHOD, PAYOUT_STATUS } from '../../../enums/payout';

export type IPayout = {
  payoutRef: string;
  operatorId: Types.ObjectId;
  amountMoney: number;
  method: PAYOUT_METHOD;
  bankName?: string;
  accountNumber?: string;
  status: PAYOUT_STATUS;
  rejectionReason?: string;
  processedBy?: Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;
};

export type PayoutModel = Model<IPayout>;
