import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';
import { uploadFile } from '../../../helpers/storageHelper';
import AppError from '../../../errors/AppError';

const getUserProfile = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await UserService.getUserProfileFromDB(user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile data retrieved successfully',
    data: result,
  });
});

//update profile
const updateProfile = catchAsync(async (req, res) => {
  const user = req.user;
  let payload = { ...req.body };

  if (typeof payload?.data === 'string') {
    try {
      payload = {
        ...payload,
        ...JSON.parse(payload.data),
      };
      delete payload.data;
    } catch (error) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid profile data');
    }
  }

  const files = req.files as
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  let imageFile: Express.Multer.File | undefined;

  if (Array.isArray(files) && files.length > 0) {
    imageFile = files.find((file) => file.fieldname === 'image');
  } else if (files) {
    if ('image' in files && Array.isArray(files.image)) {
      [imageFile] = files.image;
    }
  }

  if (imageFile) {
    payload.image = await uploadFile(imageFile, 'user/profiles');
  }

  if ('role' in payload) {
    delete payload.role;
  }
  if ('password' in payload) {
    delete payload.password;
  }

  const result = await UserService.updateProfileToDB(user, payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});
//delete profile
const deleteProfile = catchAsync(async (req, res) => {
  const { id } = req.user;
  const { password } = req.body;
  const isUserVerified = await UserService.verifyUserPassword(id, password);
  if (!isUserVerified) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'Incorrect password. Please try again.',
    });
  }

  const result = await UserService.deleteUser(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile deleted successfully',
    data: result,
  });
});

export const UserController = {
  getUserProfile,
  updateProfile,
  deleteProfile,
};
