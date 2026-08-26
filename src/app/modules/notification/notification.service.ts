import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { USER_ROLES } from '../../../enums/user';
import {
  NOTIFICATION_AUDIENCE,
  NOTIFICATION_STATUS,
} from '../../../enums/notification';
import { fcmHelper } from '../../../helpers/fcmHelper';
import { User } from '../user/user.model';
import { DeviceToken } from './deviceToken.model';
import { Notification } from './notification.model';
import { IUser } from '../user/user.interface';

const registerDeviceToken = async (
  userId: string,
  token: string,
  platform: 'android' | 'ios'
) => {
  return DeviceToken.findOneAndUpdate(
    { token },
    { userId, token, platform },
    { new: true, upsert: true }
  );
};

const unregisterDeviceToken = async (token: string) => {
  await DeviceToken.deleteOne({ token });
};

// Which toggles apply to which role — a customer has no payout, an operator
// has no wallet balance to run low on.
const ROLE_PREF_FIELDS: Partial<
  Record<USER_ROLES, (keyof IUser['notificationPrefs'])[]>
> = {
  [USER_ROLES.OPERATOR]: ['callUpdates', 'payoutConfirmations'],
  [USER_ROLES.USER]: ['callUpdates', 'lowBalanceAlerts', 'rechargeConfirmations'],
};

const pickPrefsForRole = (
  prefs: IUser['notificationPrefs'],
  role: USER_ROLES
): Partial<IUser['notificationPrefs']> => {
  const fields = ROLE_PREF_FIELDS[role];
  if (!fields) return prefs;
  return Object.fromEntries(fields.map((field) => [field, prefs[field]]));
};

const getNotificationPreferences = async (userId: string, role: USER_ROLES) => {
  const user = await User.findById(userId).select('notificationPrefs');
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
  return pickPrefsForRole(user.notificationPrefs, role);
};

const updateNotificationPreferences = async (
  userId: string,
  role: USER_ROLES,
  payload: Partial<IUser['notificationPrefs']>
) => {
  // Silently drop any toggle that doesn't belong to this role instead of
  // erroring — e.g. an operator's client sending a stale lowBalanceAlerts key.
  const allowedFields = ROLE_PREF_FIELDS[role];
  const filteredPayload = allowedFields
    ? Object.fromEntries(
        Object.entries(payload).filter(([key]) =>
          allowedFields.includes(key as keyof IUser['notificationPrefs'])
        )
      )
    : payload;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: Object.fromEntries(
        Object.entries(filteredPayload).map(([key, value]) => [
          `notificationPrefs.${key}`,
          value,
        ])
      ),
    },
    { new: true }
  ).select('notificationPrefs');
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
  return pickPrefsForRole(user.notificationPrefs, role);
};

const audienceToRoleFilter = (audience: NOTIFICATION_AUDIENCE) => {
  if (audience === NOTIFICATION_AUDIENCE.OPERATORS) {
    return { role: USER_ROLES.OPERATOR };
  }
  if (audience === NOTIFICATION_AUDIENCE.CUSTOMERS) {
    return { role: USER_ROLES.USER };
  }
  return { role: { $in: [USER_ROLES.OPERATOR, USER_ROLES.USER] } };
};

const sendBroadcast = async (
  payload: { title: string; message: string; audience: NOTIFICATION_AUDIENCE },
  adminId: string
) => {
  const { title, message, audience } = payload;

  const recipientUsers = await User.find(
    audienceToRoleFilter(audience)
  ).select('_id');
  const recipientIds = recipientUsers.map((u) => u._id);

  const deviceTokens = await DeviceToken.find({
    userId: { $in: recipientIds },
  }).select('token');
  const tokens = deviceTokens.map((d) => d.token);

  const { successCount } = await fcmHelper.sendPushToTokens(
    tokens,
    title,
    message
  );

  const notification = await Notification.create({
    title,
    message,
    audience,
    createdBy: adminId,
    status:
      successCount > 0 ? NOTIFICATION_STATUS.DELIVERED : NOTIFICATION_STATUS.FAILED,
    recipientCount: tokens.length,
    deliveredCount: successCount,
  });

  return notification;
};

const listNotifications = async (query: { page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(),
  ]);

  return {
    notifications,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const NotificationService = {
  registerDeviceToken,
  unregisterDeviceToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendBroadcast,
  listNotifications,
};
