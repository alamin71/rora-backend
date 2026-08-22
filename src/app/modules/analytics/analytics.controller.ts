import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AnalyticsService } from './analytics.service';

const getDashboard = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getDashboard();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

const getAnalytics = catchAsync(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const result = await AnalyticsService.getAnalytics(days);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Analytics retrieved successfully',
    data: result,
  });
});

export const AnalyticsController = { getDashboard, getAnalytics };
