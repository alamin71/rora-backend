import { model, Schema } from 'mongoose';
import { DEVICE_PLATFORM } from '../../../enums/notification';
import { DeviceTokenModel, IDeviceToken } from './deviceToken.interface';

const deviceTokenSchema = new Schema<IDeviceToken, DeviceTokenModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    platform: {
      type: String,
      enum: Object.values(DEVICE_PLATFORM),
      required: true,
    },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1 });

export const DeviceToken = model<IDeviceToken, DeviceTokenModel>(
  'DeviceToken',
  deviceTokenSchema
);
