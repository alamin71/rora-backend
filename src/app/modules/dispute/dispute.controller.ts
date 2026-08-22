import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DisputeService } from './dispute.service';

const listDisputes = catchAsync(async (req, res) => {
  const result = await DisputeService.listDisputes(req.query as never);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Disputes retrieved successfully',
    data: result,
  });
});

const getDisputeStats = catchAsync(async (req, res) => {
  const result = await DisputeService.getDisputeStats();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dispute stats retrieved successfully',
    data: result,
  });
});

const getDispute = catchAsync(async (req, res) => {
  const result = await DisputeService.getDispute(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dispute retrieved successfully',
    data: result,
  });
});

const resolveDispute = catchAsync(async (req, res) => {
  const result = await DisputeService.resolveDispute(
    req.params.id,
    req.user.id,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dispute resolved',
    data: result,
  });
});

const rejectDispute = catchAsync(async (req, res) => {
  const result = await DisputeService.rejectDispute(
    req.params.id,
    req.user.id,
    req.body.adminNote
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dispute rejected',
    data: result,
  });
});

export const DisputeController = {
  listDisputes,
  getDisputeStats,
  getDispute,
  resolveDispute,
  rejectDispute,
};
