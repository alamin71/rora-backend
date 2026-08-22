import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import { AdminController } from './admin.controller';
import { AdminValidation } from './admin.validation';
import { PolicyPageController } from './policy-page.controller';
import { PolicyPageValidation } from './policy-page.validation';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { fileUploadHandler } from '../../middleware/fileUploadHandler';
const router = express.Router();
const adminUpload = fileUploadHandler;

// Admin login - returns admin data
router.post(
  '/login',
  validateRequest(AdminValidation.createLoginZodSchema),
  AdminController.adminLogin
);

// Admin password reset (OTP-based) - returns admin data
router.post(
  '/forget-password',
  validateRequest(AdminValidation.createForgetPasswordZodSchema),
  AdminController.adminForgetPassword
);
router.post(
  '/verify-reset-otp',
  validateRequest(AdminValidation.createVerifyResetOtpZodSchema),
  AdminController.adminVerifyResetOtp
);
router.post(
  '/reset-password',
  validateRequest(AdminValidation.createResetPasswordZodSchema),
  AdminController.adminResetPassword
);

// Admin password change (logged in only) - returns admin data
router.patch(
  '/change-password',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.createChangePasswordZodSchema),
  AdminController.changePassword
);

// Admin resend OTP - returns admin data
router.post(
  '/resend-otp',
  validateRequest(AdminValidation.createResendOtpZodSchema),
  AdminController.adminResendOtp
);

// ============================================
// ADMIN MANAGEMENT ENDPOINTS
// ============================================

router.get(
  '/get-admin',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getAdmin
);

router.get(
  '/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getAdminProfile
);

router.patch(
  '/profile/update',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  adminUpload.fields([{ name: 'image', maxCount: 1 }]),
  AdminController.updateAdminProfile
);

router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.deleteAdmin
);
router.delete(
  '/profile/photo',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.removeProfilePhoto
);
//=============================================
// Policy Pages
//=============================================
router.get(
  '/policy',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PolicyPageController.getPolicyPages
);

router.get(
  '/policy/:type',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(PolicyPageValidation.getPolicyPageZodSchema),
  PolicyPageController.getPolicyPage
);

router.post(
  '/policy/:type',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(PolicyPageValidation.createPolicyPageZodSchema),
  PolicyPageController.createPolicyPage
);

router.patch(
  '/policy/:type',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(PolicyPageValidation.updatePolicyPageZodSchema),
  PolicyPageController.updatePolicyPage
);

export const AdminRoutes = router;
