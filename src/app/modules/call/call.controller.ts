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

const redialCall = catchAsync(async (req, res) => {
  const result = await CallService.redialCall(req.user.id, req.params.id);

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

const cancelCallByAdmin = catchAsync(async (req, res) => {
  const result = await CallService.cancelCallByAdmin(
    req.params.id,
    req.user.id
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call cancelled by admin',
    data: result,
  });
});

const getCallStatsAdmin = catchAsync(async (req, res) => {
  const result = await CallService.getCallStatsAdmin();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call stats retrieved successfully',
    data: result,
  });
});

const listCallsAdmin = catchAsync(async (req, res) => {
  const result = await CallService.listCallsAdmin(req.query as never);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Calls retrieved successfully',
    data: result,
  });
});

const exportCallsCsv = catchAsync(async (req, res) => {
  const csv = await CallService.exportCallsCsv(req.query as never);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="calls-export.csv"'
  );
  res.send(csv);
});

export const CallController = {
  requestCall,
  redialCall,
  cancelCall,
  getCall,
  listCalls,
  rateCall,
  reportCall,
  cancelCallByAdmin,
  getCallStatsAdmin,
  listCallsAdmin,
  exportCallsCsv,
};
