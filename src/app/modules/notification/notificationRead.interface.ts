import { Model, Types } from 'mongoose';

export type INotificationRead = {
  userId: Types.ObjectId;
  notificationId: Types.ObjectId;
  readAt: Date;
};

export type NotificationReadModel = Model<INotificationRead>;
