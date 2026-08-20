import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import { smsHelper } from '../../../helpers/smsHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyOtp,
} from '../../../types/auth';
import { USER_ROLES, USER_STATUS } from '../../../enums/user';
import { ResetToken } from '../resetToken/resetToken.model';
import { User } from '../user/user.model';
import AppError from '../../../errors/AppError';
import generateOTP from '../../../utils/generateOTP';
import cryptoToken from '../../../utils/cryptoToken';

const OTP_TTL_MS = 5 * 60000;
const OTP_TOKEN_TTL = '10m';

//login
const loginUserFromDB = async (payload: ILoginData) => {
  const { phone, password } = payload;
  if (!password) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Password is required!');
  }
  const isExistUser = await User.findOne({ phone }).select('+password');
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!isExistUser.verified) {
    const otp = generateOTP(4);
    smsHelper.sendOtpSms(isExistUser.phone, otp);

    const authentication = {
      oneTimeCode: otp,
      expireAt: new Date(Date.now() + OTP_TTL_MS),
    };
    await User.findOneAndUpdate({ phone }, { $set: { authentication } });

    throw new AppError(
      StatusCodes.CONFLICT,
      'Please verify your account, then try to login again'
    );
  }

  if (isExistUser.status === USER_STATUS.BLOCKED) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'Your account has been blocked. Please contact support.'
    );
  }
  if (isExistUser.status === USER_STATUS.SUSPENDED) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      isExistUser.suspensionReason
        ? `Your account has been suspended: ${isExistUser.suspensionReason}`
        : 'Your account has been suspended. Please contact support.'
    );
  }
  if (isExistUser.status === USER_STATUS.PENDING_VERIFICATION) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'Your account is still pending verification by our team.'
    );
  }

  if (!(await User.isMatchPassword(password, isExistUser.password))) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
  }

  const jwtData = {
    id: isExistUser._id,
    role: isExistUser.role,
    phone: isExistUser.phone,
    name: isExistUser.name,
  };
  const accessToken = jwtHelper.createToken(
    jwtData,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );
  const refreshToken = jwtHelper.createToken(
    jwtData,
    config.jwt.jwt_refresh_secret as string,
    config.jwt.jwt_refresh_expire_in as string
  );

  return { accessToken, refreshToken };
};

// signup — customer only; operators come through the invitation flow (see the
// upcoming Operator module) and admins are provisioned directly, not via this route
const signupUserToDB = async (payload: {
  name: string;
  phone: string;
  password: string;
}) => {
  const { name, phone, password } = payload;

  const existing = await User.findOne({ phone });
  if (existing && existing.verified) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'User already exists. Please login.'
    );
  }

  const otp = generateOTP(4);
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + OTP_TTL_MS),
  };

  if (existing && !existing.verified) {
    // Resend OTP for an unfinished signup instead of creating a duplicate user
    await User.findOneAndUpdate({ phone }, { $set: { authentication } });
  } else {
    await User.create({ name, phone, password });
    await User.findOneAndUpdate({ phone }, { $set: { authentication } });
  }

  smsHelper.sendOtpSms(phone, otp);

  const signupToken = jwtHelper.createToken(
    { phone },
    config.jwt.jwt_secret as Secret,
    OTP_TOKEN_TTL
  );

  return { otp, signupToken };
};

//forget password
const forgetPasswordToDB = async (phone: string) => {
  const isExistUser = await User.isExistUserByPhone(phone);
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const otp = generateOTP(4);
  smsHelper.sendOtpSms(isExistUser.phone, otp);

  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + OTP_TTL_MS),
  };
  await User.findOneAndUpdate({ phone }, { $set: { authentication } });

  const otpToken = jwtHelper.createToken(
    { phone: isExistUser.phone },
    config.jwt.jwt_secret as Secret,
    OTP_TOKEN_TTL
  );

  return { otp, otpToken };
};

// resend otp
const resendOtpFromDb = async (
  phoneOrToken: string,
  isToken: boolean = false
) => {
  let phone = phoneOrToken;

  if (isToken) {
    try {
      const decoded = jwtHelper.verifyToken(
        phoneOrToken,
        config.jwt.jwt_secret as Secret
      ) as JwtPayload & { phone: string };
      phone = decoded.phone;
    } catch (error) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        'Invalid or expired signup token'
      );
    }
  }

  const isExistUser = await User.isExistUserByPhone(phone);
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const otp = generateOTP(4);
  smsHelper.sendOtpSms(isExistUser.phone, otp);

  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + OTP_TTL_MS),
  };
  await User.findOneAndUpdate(
    { phone: isExistUser.phone },
    { $set: { authentication } }
  );

  const otpToken = jwtHelper.createToken(
    { phone: isExistUser.phone },
    config.jwt.jwt_secret as Secret,
    OTP_TOKEN_TTL
  );

  return { otp, otpToken };
};

//verify otp
const verifyOtpToDB = async (payload: IVerifyOtp) => {
  const { phone, oneTimeCode } = payload;
  const isExistUser = await User.findOne({ phone }).select('+authentication');
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!oneTimeCode) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please provide the OTP sent to your phone'
    );
  }

  const dbOtp = String(isExistUser.authentication?.oneTimeCode);
  const requestOtp = String(oneTimeCode);
  if (dbOtp !== requestOtp) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'You provided wrong otp');
  }

  const expireAt = isExistUser.authentication?.expireAt;
  if (!expireAt || new Date() > expireAt) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Otp already expired, Please try again'
    );
  }

  let message: string;
  let verifyToken: string | undefined;
  let user;

  if (!isExistUser.verified) {
    // Customers go straight to active. Operators (and any other non-customer
    // role) keep whatever status they were created with — e.g. an operator
    // stays pending_verification until an admin approves identity/bank
    // details, even though their phone is now confirmed.
    const nextStatus =
      isExistUser.role === USER_ROLES.USER
        ? USER_STATUS.ACTIVE
        : isExistUser.status;

    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      {
        verified: true,
        status: nextStatus,
        authentication: { oneTimeCode: null, expireAt: null },
      }
    );
    message = 'OTP verified successfully. You can now login.';
    user = await User.findById(isExistUser._id);
  } else {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      {
        authentication: {
          isResetPassword: true,
          oneTimeCode: null,
          expireAt: null,
        },
      }
    );

    const token = cryptoToken();
    await ResetToken.create({
      user: isExistUser._id,
      token,
      expireAt: new Date(Date.now() + OTP_TTL_MS),
    });
    message =
      'OTP verified successfully. Use the reset token to reset your password.';
    verifyToken = token;
  }
  return { verifyToken, message, user };
};

//reset password
const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword
) => {
  const { newPassword, confirmPassword } = payload;

  const isExistToken = await ResetToken.isExistToken(token);
  if (!isExistToken) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }

  const isExistUser = await User.findById(isExistToken.user).select(
    '+authentication'
  );
  if (!isExistUser?.authentication?.isResetPassword) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "You don't have permission to change the password. Please click again to 'Forgot Password'"
    );
  }

  const isValid = await ResetToken.isExpireToken(token);
  if (!isValid) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Token expired, Please click again to the forget password'
    );
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "New password and Confirm password doesn't match!"
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await User.findOneAndUpdate(
    { _id: isExistToken.user },
    { password: hashPassword, authentication: { isResetPassword: false } },
    { new: true }
  );
};

const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;
  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (
    currentPassword &&
    !(await User.isMatchPassword(currentPassword, isExistUser.password))
  ) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please give different password from current password'
    );
  }
  if (newPassword !== confirmPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Password and Confirm password doesn't matched"
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const result = await User.findOneAndUpdate(
    { _id: user.id },
    { password: hashPassword },
    { new: true }
  );
  return result;
};

// Refresh token
const refreshToken = async (token: string) => {
  if (!token) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Token not found');
  }

  const decoded = jwtHelper.verifyToken(
    token,
    config.jwt.jwt_refresh_secret as Secret
  );
  const { id } = decoded;

  const activeUser = await User.findById(id);
  if (!activeUser) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
  if (activeUser.status !== USER_STATUS.ACTIVE) {
    throw new AppError(StatusCodes.FORBIDDEN, 'User account is inactive');
  }
  if (!activeUser.verified) {
    throw new AppError(StatusCodes.FORBIDDEN, 'User account is not verified');
  }
  if (activeUser.isDeleted) {
    throw new AppError(StatusCodes.FORBIDDEN, 'User account is deleted');
  }

  const jwtPayload = {
    id: activeUser._id?.toString() as string,
    role: activeUser.role,
    phone: activeUser.phone,
    name: activeUser.name,
  };

  const accessToken = jwtHelper.createToken(
    jwtPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  return { accessToken };
};

export const AuthService = {
  verifyOtpToDB,
  loginUserFromDB,
  signupUserToDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  resendOtpFromDb,
  refreshToken,
};
