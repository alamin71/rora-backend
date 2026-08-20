import { model, Schema } from 'mongoose';
import { WALLET_TRANSACTION_TYPE } from '../../../enums/wallet';
import {
  IWalletTransaction,
  WalletTransactionModel,
} from './walletTransaction.interface';

const walletTransactionSchema = new Schema<
  IWalletTransaction,
  WalletTransactionModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    txRef: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: Object.values(WALLET_TRANSACTION_TYPE),
      required: true,
    },
    minutes: {
      type: Number,
      required: true,
    },
    amountMoney: {
      type: Number,
    },
    relatedCallId: {
      type: Schema.Types.ObjectId,
      ref: 'Call',
    },
    relatedTransferId: {
      type: Schema.Types.ObjectId,
      ref: 'Transfer',
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransaction = model<
  IWalletTransaction,
  WalletTransactionModel
>('WalletTransaction', walletTransactionSchema);
