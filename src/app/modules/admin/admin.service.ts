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
};
