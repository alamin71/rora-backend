import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DestinationService } from './destination.service';

const getActiveDestinations = catchAsync(async (req, res) => {
  const currency = req.query.currency as string | undefined;
  const result = await DestinationService.listActiveDestinations(currency);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Destinations retrieved successfully',
    data: result,
  });
});

const getAllDestinationsAdmin = catchAsync(async (req, res) => {
  const result = await DestinationService.listAllDestinationsForAdmin();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Destinations retrieved successfully',
    data: result,
  });
});

const createDestination = catchAsync(async (req, res) => {
  const result = await DestinationService.createDestination(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Destination created successfully',
    data: result,
  });
});

const updateDestination = catchAsync(async (req, res) => {
  const result = await DestinationService.updateDestination(
    req.params.id,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Destination updated successfully',
    data: result,
  });
});

const updateDestinationStatus = catchAsync(async (req, res) => {
  const result = await DestinationService.updateDestinationStatus(
    req.params.id,
    req.body.status
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Destination status updated successfully',
    data: result,
  });
});

const deleteDestination = catchAsync(async (req, res) => {
  await DestinationService.deleteDestination(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Destination deleted successfully',
    data: null,
  });
});

const getExchangeRates = catchAsync(async (req, res) => {
  const result = await DestinationService.listExchangeRates();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Exchange rates retrieved successfully',
    data: result,
  });
});

const upsertExchangeRate = catchAsync(async (req, res) => {
  const result = await DestinationService.upsertExchangeRate(
    req.params.currency,
    req.body.rate,
    req.user.id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Exchange rate saved successfully',
    data: result,
  });
});

export const DestinationController = {
  getActiveDestinations,
  getAllDestinationsAdmin,
  createDestination,
  updateDestination,
  updateDestinationStatus,
  deleteDestination,
  getExchangeRates,
  upsertExchangeRate,
};
