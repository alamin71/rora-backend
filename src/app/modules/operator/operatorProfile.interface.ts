import { Model, Types } from 'mongoose';
import { OPERATOR_AVAILABILITY } from '../../../enums/operator';

export type IOperatorProfile = {
  userId: Types.ObjectId;
  city: string;
  phoneNumbers: string[];
  selfieUrl?: string;
  availabilityStatus: OPERATOR_AVAILABILITY;
  shiftStartedAt?: Date;
  ratingAvg: number;
  totalCalls: number;
  totalEarnings: number;
  acceptanceRatePercent: number;
  avgResponseTimeSeconds: number;
  missedRequestsCount: number;
};

export type OperatorProfileModel = Model<IOperatorProfile>;
