import { Model, Types } from 'mongoose';
import { TRANSFER_KIND } from '../../../enums/wallet';

export type ITransfer = {
  fromUserId?: Types.ObjectId;
  toUserId: Types.ObjectId;
  minutes: number;
  kind: TRANSFER_KIND;
  commissionEarned?: number;
};

export type TransferModel = Model<ITransfer>;
