import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NotificationService } from './notification.service';

const registerDeviceToken = catchAsync(async (req, res) => {
  const { token, platform } = req.body;
  const result = await NotificationService.registerDeviceToken(
    req.user.id,
    token,
    platform
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Device registered for push notifications',
    data: result,
  });
});

const unregisterDeviceToken = catchAsync(async (req, res) => {
  await NotificationService.unregisterDeviceToken(req.body.token);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Device unregistered',
    data: null,
  });
});

const getPreferences = catchAsync(async (req, res) => {
  const result = await NotificationService.getNotificationPreferences(
    req.user.id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification preferences retrieved successfully',
    data: result,
  });
});

const updatePreferences = catchAsync(async (req, res) => {
  const result = await NotificationService.updateNotificationPreferences(
    req.user.id,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification preferences updated successfully',
    data: result,
  });
});

const sendBroadcast = catchAsync(async (req, res) => {
  const result = await NotificationService.sendBroadcast(
    req.body,
    req.user.id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification sent successfully',
    data: result,
  });
});

const listNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.listNotifications(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

export const NotificationController = {
  registerDeviceToken,
  unregisterDeviceToken,
  getPreferences,
  updatePreferences,
  sendBroadcast,
  listNotifications,
};
