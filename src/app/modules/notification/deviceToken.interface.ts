import { Model, Types } from 'mongoose';
import { DEVICE_PLATFORM } from '../../../enums/notification';

export type IDeviceToken = {
  userId: Types.ObjectId;
  token: string;
  platform: DEVICE_PLATFORM;
};

export type DeviceTokenModel = Model<IDeviceToken>;
