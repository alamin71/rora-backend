import { Model, Types } from 'mongoose';
import { CALL_FAILURE_REASON, CALL_STATUS } from '../../../enums/call';

export type ICall = {
  callRef: string;
  customerId: Types.ObjectId;
  operatorId?: Types.ObjectId;
  destinationId: Types.ObjectId;
  numberDialed: string;
  operatorSimUsed?: string;
  status: CALL_STATUS;
  failureReason?: CALL_FAILURE_REASON;
  minutesUsed?: number;
  costMoney?: number;
  operatorEarnings?: number;
  requestedAt: Date;
  acceptedAt?: Date;
  customerDialedAt?: Date;
  customerConnectedAt?: Date;
  destinationDialedAt?: Date;
  destinationConnectedAt?: Date;
  conferenceStartedAt?: Date;
  endedAt?: Date;
  callLogVerified: boolean;
};

export type CallModel = Model<ICall>;
