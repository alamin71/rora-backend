import { Model, Types } from 'mongoose';

export type IWallet = {
  userId: Types.ObjectId;
  balanceMinutes: number;
  isDistributor: boolean;
  distributorSince?: Date;
  monthlyIssuanceLimit?: number;
  commissionRatePercent?: number;
};

export type WalletModel = Model<IWallet>;
