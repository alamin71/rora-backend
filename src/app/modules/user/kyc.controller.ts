import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import AppError from '../../../errors/AppError';
import { uploadToS3 } from '../../../helpers/s3Helper';
import { KycService } from './kyc.service';

const submitKyc = catchAsync(async (req, res) => {
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  const documentFile = files?.idDocument?.[0];
  const selfieFile = files?.selfie?.[0];

  if (!documentFile) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'ID document is required');
  }

  const documentUrl = await uploadToS3(documentFile, 'kyc/documents');
  const selfieUrl = selfieFile
    ? await uploadToS3(selfieFile, 'kyc/selfies')
    : undefined;

  const result = await KycService.submitKyc(req.user.id, {
    documentUrl,
    selfieUrl,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'KYC submitted — our team will review it',
    data: result,
  });
});

const getMyKyc = catchAsync(async (req, res) => {
  const result = await KycService.getMyKyc(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'KYC status retrieved successfully',
    data: result,
  });
});

const listKycAdmin = catchAsync(async (req, res) => {
  const result = await KycService.listKycAdmin(req.query as never);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'KYC submissions retrieved successfully',
    data: result,
  });
});

const getKycDetail = catchAsync(async (req, res) => {
  const result = await KycService.getKycDetail(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'KYC submission retrieved successfully',
    data: result,
  });
});

const approveKyc = catchAsync(async (req, res) => {
  const result = await KycService.approveKyc(req.params.id, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'KYC approved',
    data: result,
  });
});

const rejectKyc = catchAsync(async (req, res) => {
  const result = await KycService.rejectKyc(
    req.params.id,
    req.user.id,
    req.body.reason
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'KYC rejected',
    data: result,
  });
});

export const KycController = {
  submitKyc,
  getMyKyc,
  listKycAdmin,
  getKycDetail,
  approveKyc,
  rejectKyc,
};
