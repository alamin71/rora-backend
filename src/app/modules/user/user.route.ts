import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import auth from '../../middleware/auth';
import { s3FileUploadHandler } from '../../middleware/s3FileUploadHandler';
import validateRequest from '../../middleware/validateRequest';
const router = express.Router();

const anyRole = auth(
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.OPERATOR,
  USER_ROLES.USER
);

router
  .route('/profile')
  .get(anyRole, UserController.getUserProfile)
  .patch(
    anyRole,
    s3FileUploadHandler.fields([{ name: 'image', maxCount: 1 }]),
    validateRequest(UserValidation.updateUserZodSchema),
    UserController.updateProfile
  );

router.delete('/delete', anyRole, UserController.deleteProfile);

export const UserRouter = router;
