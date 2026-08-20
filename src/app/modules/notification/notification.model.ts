import { model, Schema } from 'mongoose';
import {
  NOTIFICATION_AUDIENCE,
  NOTIFICATION_STATUS,
} from '../../../enums/notification';
import { INotification, NotificationModel } from './notification.interface';

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    audience: {
      type: String,
      enum: Object.values(NOTIFICATION_AUDIENCE),
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUS),
      required: true,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Notification = model<INotification, NotificationModel>(
  'Notification',
  notificationSchema
);
