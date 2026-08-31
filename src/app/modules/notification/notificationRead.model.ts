import { model, Schema } from 'mongoose';
import {
  INotificationRead,
  NotificationReadModel,
} from './notificationRead.interface';

const notificationReadSchema = new Schema<
  INotificationRead,
  NotificationReadModel
>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notificationId: {
    type: Schema.Types.ObjectId,
    ref: 'Notification',
    required: true,
  },
  readAt: {
    type: Date,
    default: Date.now,
  },
});

// One read-receipt per user per notification.
notificationReadSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true }
);

export const NotificationRead = model<
  INotificationRead,
  NotificationReadModel
>('NotificationRead', notificationReadSchema);
