import { model, Schema } from 'mongoose';
import { CALL_FAILURE_REASON, CALL_STATUS } from '../../../enums/call';
import { CallModel, ICall } from './call.interface';

const callSchema = new Schema<ICall, CallModel>(
  {
    callRef: {
      type: String,
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
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Destination',
      required: true,
    },
    numberDialed: {
      type: String,
      required: true,
    },
    operatorSimUsed: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(CALL_STATUS),
      default: CALL_STATUS.REQUESTED,
    },
    failureReason: {
      type: String,
      enum: Object.values(CALL_FAILURE_REASON),
    },
    minutesUsed: {
      type: Number,
    },
    costMoney: {
      type: Number,
    },
    operatorEarnings: {
      type: Number,
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    acceptedAt: { type: Date },
    customerDialedAt: { type: Date },
    customerConnectedAt: { type: Date },
    destinationDialedAt: { type: Date },
    destinationConnectedAt: { type: Date },
    conferenceStartedAt: { type: Date },
    endedAt: { type: Date },
    callLogVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

callSchema.index({ customerId: 1, createdAt: -1 });
callSchema.index({ operatorId: 1, createdAt: -1 });
callSchema.index({ status: 1 });

export const Call = model<ICall, CallModel>('Call', callSchema);
