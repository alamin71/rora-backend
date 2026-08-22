import { Model, Types } from 'mongoose';

export type ICallRating = {
  callId: Types.ObjectId;
  customerId: Types.ObjectId;
  operatorId: Types.ObjectId;
  stars: number;
  tags: string[];
  comment?: string;
};

export type CallRatingModel = Model<ICallRating>;
