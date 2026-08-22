import { Model, Types } from 'mongoose';
import { DISPUTE_STATUS } from '../../../enums/dispute';

export type IDispute = {
  disputeRef: string;
  callId: Types.ObjectId;
  customerId: Types.ObjectId;
  operatorId?: Types.ObjectId;
  amount: number;
  reason: string;
  status: DISPUTE_STATUS;
  refundAmount?: number;
  adminNote?: string;
  resolvedBy?: Types.ObjectId;
};

export type DisputeModel = Model<IDispute>;
