import { z } from 'zod';
import { NOTIFICATION_AUDIENCE, DEVICE_PLATFORM } from '../../../enums/notification';

const registerDeviceTokenZodSchema = z.object({
  body: z.object({
    token: z.string().nonempty({ message: 'Device token is required' }),
    platform: z.nativeEnum(DEVICE_PLATFORM),
  }),
});

const unregisterDeviceTokenZodSchema = z.object({
  body: z.object({
    token: z.string().nonempty({ message: 'Device token is required' }),
  }),
});

const updatePreferencesZodSchema = z.object({
  body: z.object({
    callUpdates: z.boolean().optional(),
    lowBalanceAlerts: z.boolean().optional(),
    rechargeConfirmations: z.boolean().optional(),
    payoutConfirmations: z.boolean().optional(),
  }),
});

const sendBroadcastZodSchema = z.object({
  body: z.object({
    title: z.string().nonempty({ message: 'Title is required' }),
    message: z.string().nonempty({ message: 'Message is required' }),
    audience: z.nativeEnum(NOTIFICATION_AUDIENCE),
  }),
});

export const NotificationValidation = {
  registerDeviceTokenZodSchema,
  unregisterDeviceTokenZodSchema,
  updatePreferencesZodSchema,
  sendBroadcastZodSchema,
};
