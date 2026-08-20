import { model, Schema } from 'mongoose';
import { IWallet, WalletModel } from './wallet.interface';

const walletSchema = new Schema<IWallet, WalletModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balanceMinutes: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isDistributor: {
      type: Boolean,
      default: false,
    },
    distributorSince: {
      type: Date,
    },
    monthlyIssuanceLimit: {
      type: Number,
    },
    commissionRatePercent: {
      type: Number,
    },
  },
  { timestamps: true }
);

export const Wallet = model<IWallet, WalletModel>('Wallet', walletSchema);
