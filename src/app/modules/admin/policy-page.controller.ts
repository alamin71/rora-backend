import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import AppError from '../../../errors/AppError';
import { PolicyPageService } from './policy-page.service';

const resolveSingleParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const getPolicyPages = catchAsync(async (req: Request, res: Response) => {
  const result = await PolicyPageService.getPolicyPagesFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Policy pages retrieved successfully',
    data: result,
  });
});

const getPolicyPage = catchAsync(async (req: Request, res: Response) => {
  const type = resolveSingleParam(req.params.type);

  if (!type) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Policy page type is required');
  }

  const result = await PolicyPageService.getPolicyPageFromDB(type);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Policy page retrieved successfully',
    data: result,
  });
});

const createPolicyPage = catchAsync(async (req: Request, res: Response) => {
  const type = resolveSingleParam(req.params.type);

  if (!type) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Policy page type is required');
  }

  const payload = req.body;
  const result = await PolicyPageService.createPolicyPageFromDB(type, payload);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Policy page created successfully',
    data: result,
  });
});

const updatePolicyPage = catchAsync(async (req: Request, res: Response) => {
  const type = resolveSingleParam(req.params.type);

  if (!type) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Policy page type is required');
  }

  const payload = req.body;
  const result = await PolicyPageService.updatePolicyPageFromDB(type, payload);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Policy page updated successfully',
    data: result,
  });
});

export const PolicyPageController = {
  getPolicyPages,
  getPolicyPage,
  createPolicyPage,
  updatePolicyPage,
};
