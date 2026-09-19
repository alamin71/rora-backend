import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import AppError from '../../../errors/AppError';
import { uploadToS3 } from '../../../helpers/s3Helper';
import { smsHelper } from '../../../helpers/smsHelper';
import normalizePhone from '../../../utils/normalizePhone';
import { OperatorService } from './operator.service';
import { OperatorValidation } from './operator.validation';

const inviteOperator = catchAsync(async (req, res) => {
  const { countryCode, phone, ...rest } = req.body;
  const payload = { ...rest, phone: normalizePhone(countryCode, phone) };
  const result = await OperatorService.inviteOperator(payload, req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Invitation sent successfully',
    data: result,
  });
});

const getInvitation = catchAsync(async (req, res) => {
  const result = await OperatorService.validateInvitation(req.params.code);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Invitation is valid',
    data: result,
  });
});

const operatorSignup = catchAsync(async (req, res) => {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(req.body.data);
  } catch (error) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Invalid signup data — expected a JSON "data" field'
    );
  }

  const { countryCode, phone, ...parsed } =
    OperatorValidation.operatorSignupZodSchema.parse(payload);

  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  const selfieFile = files?.selfie?.[0];
  const selfieUrl = selfieFile
    ? await uploadToS3(selfieFile, 'operator/selfies')
    : undefined;

  const result = await OperatorService.operatorSignup({
    ...parsed,
    phone: normalizePhone(countryCode, phone),
    selfieUrl,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: smsHelper.isConfigured()
      ? 'Signup OTP sent to your phone. Please verify to activate your account.'
      : `Signup OTP sent. [DEV: ${result.otp}]`,
    data: { signupToken: result.signupToken },
  });
});

const verifyOperator = catchAsync(async (req, res) => {
  const result = await OperatorService.verifyOperator(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Operator verified and activated successfully',
    data: result,
  });
});

const getOperatorStats = catchAsync(async (req, res) => {
  const result = await OperatorService.getOperatorStats();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Operator stats retrieved successfully',
    data: result,
  });
});

const listOperatorsAdmin = catchAsync(async (req, res) => {
  const result = await OperatorService.listOperatorsAdmin(req.query as never);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Operators retrieved successfully',
    data: result,
  });
});

const getOperatorDetail = catchAsync(async (req, res) => {
  const result = await OperatorService.getOperatorDetail(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Operator retrieved successfully',
    data: result,
  });
});

const suspendOperator = catchAsync(async (req, res) => {
  const result = await OperatorService.suspendOperator(
    req.params.id,
    req.body.reason
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Operator suspended successfully',
    data: result,
  });
});

const activateOperator = catchAsync(async (req, res) => {
  const result = await OperatorService.activateOperator(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Operator activated successfully',
    data: result,
  });
});

const getOwnProfile = catchAsync(async (req, res) => {
  const result = await OperatorService.getOperatorDetail(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile retrieved successfully',
    data: result,
  });
});

const updateOwnProfile = catchAsync(async (req, res) => {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(req.body.data);
  } catch (error) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Invalid update data — expected a JSON "data" field'
    );
  }
  const parsed = OperatorValidation.updateOwnProfileZodSchema.parse(payload);

  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  const imageFile = files?.image?.[0];
  const imageUrl = imageFile
    ? await uploadToS3(imageFile, 'operator/images')
    : undefined;

  const result = await OperatorService.updateOwnProfile(req.user.id, {
    ...parsed,
    imageUrl,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

export const OperatorController = {
  inviteOperator,
  getInvitation,
  operatorSignup,
  verifyOperator,
  getOperatorStats,
  listOperatorsAdmin,
  getOperatorDetail,
  suspendOperator,
  activateOperator,
  getOwnProfile,
  updateOwnProfile,
};
