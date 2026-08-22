import { model, Schema } from 'mongoose';
import { CallRatingModel, ICallRating } from './callRating.interface';

const callRatingSchema = new Schema<ICallRating, CallRatingModel>(
  {
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
      required: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    tags: {
      type: [String],
      default: [],
    },
    comment: {
      type: String,
    },
  },
  { timestamps: true }
);

export const CallRating = model<ICallRating, CallRatingModel>(
  'CallRating',
  callRatingSchema
);
