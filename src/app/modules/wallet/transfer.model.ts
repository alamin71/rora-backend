import { model, Schema } from 'mongoose';
import { TRANSFER_KIND } from '../../../enums/wallet';
import { ITransfer, TransferModel } from './transfer.interface';

const transferSchema = new Schema<ITransfer, TransferModel>(
  {
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    minutes: {
      type: Number,
      required: true,
      min: 1,
    },
    kind: {
      type: String,
      enum: Object.values(TRANSFER_KIND),
      required: true,
    },
    commissionEarned: {
      type: Number,
    },
  },
  { timestamps: true }
);

export const Transfer = model<ITransfer, TransferModel>(
  'Transfer',
  transferSchema
);
