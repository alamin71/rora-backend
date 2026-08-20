import { Model, Types } from 'mongoose';
import {
  NOTIFICATION_AUDIENCE,
  NOTIFICATION_STATUS,
} from '../../../enums/notification';

export type INotification = {
  title: string;
  message: string;
  audience: NOTIFICATION_AUDIENCE;
  createdBy: Types.ObjectId;
  status: NOTIFICATION_STATUS;
  recipientCount: number;
  deliveredCount: number;
};

export type NotificationModel = Model<INotification>;
