import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import AppError from '../../../errors/AppError';
import { uploadToS3 } from '../../../helpers/s3Helper';
import { smsHelper } from '../../../helpers/smsHelper';
import { OperatorService } from './operator.service';
import { OperatorValidation } from './operator.validation';

const inviteOperator = catchAsync(async (req, res) => {
  const result = await OperatorService.inviteOperator(req.body, req.user.id);

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

  const parsed = OperatorValidation.operatorSignupZodSchema.parse(payload);

  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  const selfieFile = files?.selfie?.[0];
  const selfieUrl = selfieFile
    ? await uploadToS3(selfieFile, 'operator/selfies')
    : undefined;

  const result = await OperatorService.operatorSignup({
    ...parsed,
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

export const OperatorController = {
  inviteOperator,
  getInvitation,
  operatorSignup,
  verifyOperator,
};
