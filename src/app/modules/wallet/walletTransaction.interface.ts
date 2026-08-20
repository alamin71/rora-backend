import { Model, Types } from 'mongoose';
import { WALLET_TRANSACTION_TYPE } from '../../../enums/wallet';

export type IWalletTransaction = {
  userId: Types.ObjectId;
  txRef: string;
  type: WALLET_TRANSACTION_TYPE;
  minutes: number;
  amountMoney?: number;
  relatedCallId?: Types.ObjectId;
  relatedTransferId?: Types.ObjectId;
  balanceAfter: number;
};

export type WalletTransactionModel = Model<IWalletTransaction>;
