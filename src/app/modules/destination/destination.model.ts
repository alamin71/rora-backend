import { model, Schema } from 'mongoose';
import { DESTINATION_STATUS } from '../../../enums/destination';
import { DestinationModel, IDestination } from './destination.interface';

const destinationSchema = new Schema<IDestination, DestinationModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    prefix: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerRatePerMin: {
      type: Number,
      required: true,
      min: 0,
    },
    operatorPayoutPerMin: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(DESTINATION_STATUS),
      default: DESTINATION_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

export const Destination = model<IDestination, DestinationModel>(
  'Destination',
  destinationSchema
);
