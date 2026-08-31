import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { NotificationController } from './notification.controller';
import { NotificationValidation } from './notification.validation';

const router = express.Router();

const anyRole = auth(
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.OPERATOR,
  USER_ROLES.USER
);
const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);

router.post(
  '/device-token',
  anyRole,
  validateRequest(NotificationValidation.registerDeviceTokenZodSchema),
  NotificationController.registerDeviceToken
);
router.delete(
  '/device-token',
  anyRole,
  validateRequest(NotificationValidation.unregisterDeviceTokenZodSchema),
  NotificationController.unregisterDeviceToken
);

router.get('/', anyRole, NotificationController.listMyNotifications);
router.get('/unread-count', anyRole, NotificationController.getUnreadCount);
router.patch('/:id/read', anyRole, NotificationController.markNotificationRead);

router.get('/preferences', anyRole, NotificationController.getPreferences);
router.patch(
  '/preferences',
  anyRole,
  validateRequest(NotificationValidation.updatePreferencesZodSchema),
  NotificationController.updatePreferences
);

router.post(
  '/admin',
  adminOnly,
  validateRequest(NotificationValidation.sendBroadcastZodSchema),
  NotificationController.sendBroadcast
);
router.get('/admin', adminOnly, NotificationController.listNotifications);

export const NotificationRouter = router;
