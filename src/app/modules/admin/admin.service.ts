import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import { JwtPayload } from 'jsonwebtoken';
import { AuthService } from '../auth/auth.service';
import { USER_ROLES } from '../../../enums/user';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyOtp,
} from '../../../types/auth';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import generateOTP from '../../../utils/generateOTP';

const ensureAdminUserByPhone = async (phone: string) => {
  const user = await User.findOne({ phone });

  if (!user) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (![USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any)) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'This account is not authorized for admin operations'
    );
  }

  return user;
};

const deleteAdminFromDB = async (id: string): Promise<void> => {
  const isExistAdmin = await User.findByIdAndDelete(id);
  if (!isExistAdmin) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to delete Admin');
  }
};

const getAdminFromDB = async (): Promise<IUser[]> => {
  const admins = await User.find({ role: USER_ROLES.ADMIN }).select(
    'name email phone role image status'
  );
  return admins;
};

// Get Admin Profile
const getAdminProfileFromDB = async (admin: JwtPayload) => {
  const adminData = await User.findById(admin.id);
  if (!adminData) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
  }
  return adminData;
};

// Update Admin Profile
const updateAdminProfileInDB = async (
  admin: JwtPayload,
  payload: Partial<IUser>
) => {
  // Prevent role and password change through this endpoint
  delete payload.role;
  delete payload.password;

  const updatedAdmin = await User.findByIdAndUpdate(admin.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updatedAdmin) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
  }

  return updatedAdmin;
};

const adminLoginToDB = async (payload: ILoginData) => {
  await ensureAdminUserByPhone(payload.phone);

  const tokens = await AuthService.loginUserFromDB(payload);
  const admin = await User.findOne({ phone: payload.phone }).select(
    'name email phone role image status verified'
  );

  return {
    ...tokens,
    admin,
  };
};

const adminForgetPasswordToDB = async (phone: string) => {
  await ensureAdminUserByPhone(phone);
  return AuthService.forgetPasswordToDB(phone);
};

const adminVerifyResetOtpToDB = async (payload: IVerifyOtp) => {
  await ensureAdminUserByPhone(payload.phone);
  return AuthService.verifyOtpToDB(payload);
};

const adminResetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword
) => {
  return AuthService.resetPasswordToDB(token, payload);
};

const adminResendOtpToDB = async (phone: string) => {
  await ensureAdminUserByPhone(phone);
  return AuthService.resendOtpFromDb(phone, false);
};

const changePasswordForAdminInDB = async (
  admin: JwtPayload,
  payload: IChangePassword
) => {
  return AuthService.changePasswordToDB(admin, payload);
};

const removeProfilePhotoFromDB = async (admin: JwtPayload) => {
  const updatedAdmin = await User.findByIdAndUpdate(
    admin.id,
    { image: '' },
    { new: true, runValidators: true }
  );

  if (!updatedAdmin) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
  }

  return updatedAdmin;
};

// This is a separate, email-specific OTP flow for admins who want to change
// their contact email — distinct from the phone-based login/reset OTP above
const requestEmailChangeToDB = async (admin: JwtPayload, newEmail: string) => {
  const normalizedNewEmail = newEmail.trim().toLowerCase();

  const adminData = await User.findById(admin.id);
  if (!adminData) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
  }

  const existingUser = await User.findOne({ email: normalizedNewEmail });
  if (existingUser && existingUser._id.toString() !== admin.id) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Email already in use');
  }

  if (normalizedNewEmail === adminData.email) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'New email cannot be the same as current email'
    );
  }

  const otp = generateOTP(6);

  const emailChangeTemplate = emailTemplate.emailChangeOtp({
    name: adminData.name,
    otp,
    newEmail: normalizedNewEmail,
  });
  await emailHelper.sendEmail(emailChangeTemplate);

  const authentication = {
    ...adminData.authentication,
    pendingEmail: normalizedNewEmail,
    emailChangeOtp: otp,
    emailChangeExpireAt: new Date(Date.now() + 5 * 60000),
  };

  await User.findByIdAndUpdate(admin.id, { authentication });

  return {
    otp,
    message: `OTP sent to ${normalizedNewEmail}`,
  };
};

const verifyEmailChangeOtpToDB = async (admin: JwtPayload, otp: number) => {
  const adminData = await User.findById(admin.id).select('+authentication');
  if (!adminData) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
  }

  const authentication = adminData.authentication;

  if (!authentication?.pendingEmail) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'No email change request found'
    );
  }

  if (!otp) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'OTP is required');
  }

  const dbOtp = String(authentication?.emailChangeOtp);
  const requestOtp = String(otp);

  if (dbOtp !== requestOtp) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
  }

  const expireAt = authentication?.emailChangeExpireAt;
  if (!expireAt) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'OTP already expired, please request again'
    );
  }

  const date = new Date();
  if (date > expireAt) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'OTP already expired, please request again'
    );
  }

  const updatedAdmin = await User.findByIdAndUpdate(
    admin.id,
    {
      email: authentication.pendingEmail,
      authentication: {
        isResetPassword: false,
        oneTimeCode: null,
        expireAt: null,
        pendingEmail: '',
        emailChangeOtp: null,
        emailChangeExpireAt: null,
      },
    },
    { new: true }
  );

  return {
    email: updatedAdmin?.email,
    message: 'OTP verified and email changed successfully',
  };
};

export const AdminService = {
  deleteAdminFromDB,
  getAdminFromDB,
  getAdminProfileFromDB,
  updateAdminProfileInDB,
  adminLoginToDB,
  adminForgetPasswordToDB,
  adminVerifyResetOtpToDB,
  adminResetPasswordToDB,
  adminResendOtpToDB,
  changePasswordForAdminInDB,
  removeProfilePhotoFromDB,
  requestEmailChangeToDB,
  verifyEmailChangeOtpToDB,
};
