import { model, Schema } from 'mongoose';
import { PAYOUT_METHOD, PAYOUT_STATUS } from '../../../enums/payout';
import { IPayout, PayoutModel } from './payout.interface';

const payoutSchema = new Schema<IPayout, PayoutModel>(
  {
    payoutRef: {
      type: String,
      required: true,
      unique: true,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amountMoney: {
      type: Number,
      required: true,
      min: 0.01,
    },
    method: {
      type: String,
      enum: Object.values(PAYOUT_METHOD),
      required: true,
    },
    bankName: { type: String },
    accountNumber: { type: String },
    status: {
      type: String,
      enum: Object.values(PAYOUT_STATUS),
      default: PAYOUT_STATUS.PENDING,
    },
    rejectionReason: { type: String },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

payoutSchema.index({ operatorId: 1, status: 1 });

export const Payout = model<IPayout, PayoutModel>('Payout', payoutSchema);
