import { model, Schema } from 'mongoose';
import { DISPUTE_STATUS } from '../../../enums/dispute';
import { DisputeModel, IDispute } from './dispute.interface';

const disputeSchema = new Schema<IDispute, DisputeModel>(
  {
    disputeRef: {
      type: String,
      required: true,
      unique: true,
    },
    callId: {
      type: Schema.Types.ObjectId,
      ref: 'Call',
      required: true,
      unique: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DISPUTE_STATUS),
      default: DISPUTE_STATUS.OPEN,
    },
    refundAmount: {
      type: Number,
    },
    adminNote: {
      type: String,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

disputeSchema.index({ status: 1 });

export const Dispute = model<IDispute, DisputeModel>('Dispute', disputeSchema);
