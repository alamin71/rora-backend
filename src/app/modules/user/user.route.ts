import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import { KycController } from './kyc.controller';
import auth from '../../middleware/auth';
import { fileUploadHandler } from '../../middleware/fileUploadHandler';
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
    fileUploadHandler.fields([{ name: 'image', maxCount: 1 }]),
    validateRequest(UserValidation.updateUserZodSchema),
    UserController.updateProfile
  );

router.delete('/delete', anyRole, UserController.deleteProfile);

// ============================================
// KYC — customer submits, admin reviews
// ============================================
router.post(
  '/kyc',
  auth(USER_ROLES.USER),
  fileUploadHandler.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  KycController.submitKyc
);
router.get('/kyc', auth(USER_ROLES.USER), KycController.getMyKyc);

// ============================================
// Admin — customer management
// ============================================
const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);

// Registered before /admin/:id so the literal "stats"/"kyc" segments never
// get swallowed by the :id wildcard.
router.get('/admin/stats', adminOnly, UserController.getCustomerStats);
router.get('/admin/kyc', adminOnly, KycController.listKycAdmin);
router.get('/admin/kyc/:id', adminOnly, KycController.getKycDetail);
router.patch('/admin/kyc/:id/approve', adminOnly, KycController.approveKyc);
router.patch(
  '/admin/kyc/:id/reject',
  adminOnly,
  validateRequest(UserValidation.rejectKycZodSchema),
  KycController.rejectKyc
);

router.get('/admin', adminOnly, UserController.listCustomersAdmin);
router.get('/admin/:id', adminOnly, UserController.getCustomerDetail);
router.patch(
  '/admin/:id/suspend',
  adminOnly,
  validateRequest(UserValidation.suspendCustomerZodSchema),
  UserController.suspendCustomer
);
router.patch(
  '/admin/:id/mark-distributor',
  adminOnly,
  validateRequest(UserValidation.markAsDistributorZodSchema),
  UserController.markAsDistributor
);

export const UserRouter = router;
