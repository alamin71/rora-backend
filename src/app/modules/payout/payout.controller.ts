import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PayoutService } from './payout.service';

const requestPayout = catchAsync(async (req, res) => {
  const result = await PayoutService.requestPayout(req.user.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout requested successfully',
    data: result,
  });
});

const getMyPayouts = catchAsync(async (req, res) => {
  const result = await PayoutService.getMyPayouts(req.user.id, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payouts retrieved successfully',
    data: result,
  });
});

const listAllPayouts = catchAsync(async (req, res) => {
  const result = await PayoutService.listAllPayouts(req.query as never);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payouts retrieved successfully',
    data: result,
  });
});

const getPayoutStats = catchAsync(async (req, res) => {
  const result = await PayoutService.getPayoutStats();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout stats retrieved successfully',
    data: result,
  });
});

const approvePayout = catchAsync(async (req, res) => {
  const result = await PayoutService.approvePayout(req.params.id, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout approved',
    data: result,
  });
});

const markPaid = catchAsync(async (req, res) => {
  const result = await PayoutService.markPaid(req.params.id, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout marked as paid',
    data: result,
  });
});

const rejectPayout = catchAsync(async (req, res) => {
  const result = await PayoutService.rejectPayout(
    req.params.id,
    req.user.id,
    req.body.reason
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payout rejected',
    data: result,
  });
});

export const PayoutController = {
  requestPayout,
  getMyPayouts,
  listAllPayouts,
  getPayoutStats,
  approvePayout,
  markPaid,
  rejectPayout,
};
