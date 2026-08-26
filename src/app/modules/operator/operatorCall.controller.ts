import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { OperatorCallService } from './operatorCall.service';

const setAvailability = catchAsync(async (req, res) => {
  const result = await OperatorCallService.setAvailability(
    req.user.id,
    req.body.status
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Availability updated successfully',
    data: result,
  });
});

const getQueue = catchAsync(async (req, res) => {
  const result = await OperatorCallService.getQueue();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Queue retrieved successfully',
    data: result,
  });
});

const acceptCall = catchAsync(async (req, res) => {
  const result = await OperatorCallService.acceptCall(
    req.user.id,
    req.params.id
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Request locked to you',
    data: result,
  });
});

const skipCall = catchAsync(async (req, res) => {
  await OperatorCallService.skipCall(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Request skipped',
    data: null,
  });
});

const dialCustomer = catchAsync(async (req, res) => {
  const result = await OperatorCallService.dialCustomer(
    req.user.id,
    req.params.id
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dialing customer',
    data: result,
  });
});

const customerConnected = catchAsync(async (req, res) => {
  const result = await OperatorCallService.customerConnected(
    req.user.id,
    req.params.id
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Customer connected',
    data: result,
  });
});

const dialDestination = catchAsync(async (req, res) => {
  const result = await OperatorCallService.dialDestination(
    req.user.id,
    req.params.id
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dialing destination',
    data: result,
  });
});

const destinationConnected = catchAsync(async (req, res) => {
  const result = await OperatorCallService.destinationConnected(
    req.user.id,
    req.params.id
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Destination connected',
    data: result,
  });
});

const startConference = catchAsync(async (req, res) => {
  const result = await OperatorCallService.startConference(
    req.user.id,
    req.params.id
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Conference started — billing has begun',
    data: result,
  });
});

const endCall = catchAsync(async (req, res) => {
  const result = await OperatorCallService.endCall(
    req.user.id,
    req.params.id,
    req.body.operatorSimUsed
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call ended successfully',
    data: result,
  });
});

const markFailed = catchAsync(async (req, res) => {
  const result = await OperatorCallService.markFailed(
    req.user.id,
    req.params.id,
    req.body.failureReason
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call marked as failed',
    data: result,
  });
});

const getActiveCall = catchAsync(async (req, res) => {
  const result = await OperatorCallService.getActiveCall(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result
      ? 'Active call retrieved successfully'
      : 'No active call for this operator',
    data: result,
  });
});

const getOperatorCall = catchAsync(async (req, res) => {
  const result = await OperatorCallService.getOperatorCall(
    req.user.id,
    req.params.id
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call retrieved successfully',
    data: result,
  });
});

const getHistory = catchAsync(async (req, res) => {
  const result = await OperatorCallService.getHistory(req.user.id, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call history retrieved successfully',
    data: result,
  });
});

const getEarnings = catchAsync(async (req, res) => {
  const result = await OperatorCallService.getEarnings(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Earnings retrieved successfully',
    data: result,
  });
});

const getPerformance = catchAsync(async (req, res) => {
  const result = await OperatorCallService.getPerformance(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Performance retrieved successfully',
    data: result,
  });
});

export const OperatorCallController = {
  setAvailability,
  getQueue,
  acceptCall,
  skipCall,
  getActiveCall,
  dialCustomer,
  customerConnected,
  dialDestination,
  destinationConnected,
  startConference,
  endCall,
  markFailed,
  getOperatorCall,
  getHistory,
  getEarnings,
  getPerformance,
};
