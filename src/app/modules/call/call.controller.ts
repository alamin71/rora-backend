import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DisputeService } from '../dispute/dispute.service';
import { CallService } from './call.service';

const requestCall = catchAsync(async (req, res) => {
  const result = await CallService.requestCall(req.user.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call request submitted — searching for an operator',
    data: result,
  });
});

const cancelCall = catchAsync(async (req, res) => {
  const result = await CallService.cancelCall(req.user.id, req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call request cancelled',
    data: result,
  });
});

const getCall = catchAsync(async (req, res) => {
  const result = await CallService.getCallById(req.user.id, req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call retrieved successfully',
    data: result,
  });
});

const listCalls = catchAsync(async (req, res) => {
  const result = await CallService.listCustomerCalls(req.user.id, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call history retrieved successfully',
    data: result,
  });
});

const rateCall = catchAsync(async (req, res) => {
  const result = await CallService.rateCall(
    req.user.id,
    req.params.id,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Thanks for rating your call',
    data: result,
  });
});

const reportCall = catchAsync(async (req, res) => {
  const result = await DisputeService.createDispute(
    req.user.id,
    req.params.id,
    req.body.reason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your report has been submitted — our team will review it',
    data: result,
  });
});

export const CallController = {
  requestCall,
  cancelCall,
  getCall,
  listCalls,
  rateCall,
  reportCall,
};
