import { model, Schema } from 'mongoose';
import { OPERATOR_AVAILABILITY } from '../../../enums/operator';
import {
  IOperatorProfile,
  OperatorProfileModel,
} from './operatorProfile.interface';

const operatorProfileSchema = new Schema<
  IOperatorProfile,
  OperatorProfileModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    city: {
      type: String,
      required: true,
    },
    phoneNumbers: {
      type: [String],
      default: [],
    },
    selfieUrl: {
      type: String,
    },
    availabilityStatus: {
      type: String,
      enum: Object.values(OPERATOR_AVAILABILITY),
      default: OPERATOR_AVAILABILITY.OFFLINE,
    },
    shiftStartedAt: {
      type: Date,
    },
    ratingAvg: {
      type: Number,
      default: 0,
    },
    totalCalls: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    acceptedCount: {
      type: Number,
      default: 0,
    },
    acceptanceRatePercent: {
      type: Number,
      default: 0,
    },
    avgResponseTimeSeconds: {
      type: Number,
      default: 0,
    },
    missedRequestsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const OperatorProfile = model<IOperatorProfile, OperatorProfileModel>(
  'OperatorProfile',
  operatorProfileSchema
);
