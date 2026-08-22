import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import { jwtHelper } from '../../../helpers/jwtHelper';

const extractPhoneFromOtpToken = (req: Request) => {
  const otpToken =
    (req.headers['otp-token'] as string) ||
    (req.headers['signup-token'] as string) ||
    ((req.headers.authorization as string)?.split(' ')[1] as string);

  if (!otpToken) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'OTP token is required');
  }

  let decoded;
  try {
    decoded = jwtHelper.verifyToken(otpToken, config.jwt.jwt_secret as Secret);
  } catch (error) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      'Invalid or expired OTP token'
    );
  }

  const phone = decoded?.phone as string | undefined;
  if (!phone) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid OTP token payload');
  }

  return phone;
};

const signupUser = catchAsync(async (req, res) => {
  const payload = req.body;
  const result = await AuthService.signupUserToDB(payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      'Signup OTP sent to your phone. Please verify to activate your account.',
    data: { signupToken: result.signupToken },
  });
});

const loginUser = catchAsync(async (req, res) => {
  const { ...loginData } = req.body;
  const result = await AuthService.loginUserFromDB(loginData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User logged in successfully.',
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const { phone } = req.body;
  const result = await AuthService.forgetPasswordToDB(phone);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'We have sent a one-time passcode (OTP) to your phone.',
    data: { otpToken: result.otpToken },
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const token = req.headers['reset-token'] as string;
  const { ...resetData } = req.body;
  const result = await AuthService.resetPasswordToDB(token!, resetData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your password has been successfully reset.',
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const user = req.user;
  const { ...passwordData } = req.body;
  const result = await AuthService.changePasswordToDB(user, passwordData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your password has been successfully changed',
    data: result,
  });
});

// verify OTP
const verifyOtp = catchAsync(async (req, res) => {
  const { otp } = req.body;
  const phone = extractPhoneFromOtpToken(req);

  const result = await AuthService.verifyOtpToDB({
    phone,
    oneTimeCode: Number(otp),
  });

  const responseData = result.verifyToken
    ? { resetToken: result.verifyToken }
    : { user: result.user };

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: responseData,
  });
});

// resend Otp
const resendOtp = catchAsync(async (req, res) => {
  const signupToken = req.headers['signup-token'] as string;
  const { phone } = req.body;

  if (!signupToken && !phone) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Phone number is required when signup-token is not provided'
    );
  }

  const result = signupToken
    ? await AuthService.resendOtpFromDb(signupToken, true)
    : await AuthService.resendOtpFromDb(phone, false);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'OTP sent successfully again',
    data: { otpToken: result.otpToken },
  });
});

// refresh token
const refreshToken = catchAsync(async (req, res) => {
  const refreshToken = req.headers?.refreshtoken as string;
  const result = await AuthService.refreshToken(refreshToken);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Access token retrieved successfully',
    data: result,
  });
});

export const AuthController = {
  signupUser,
  loginUser,
  forgetPassword,
  resetPassword,
  changePassword,
  verifyOtp,
  resendOtp,
  refreshToken,
};
