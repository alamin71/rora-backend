import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { fileUploadHandler } from '../../middleware/fileUploadHandler';
import { OperatorController } from './operator.controller';
import { OperatorValidation } from './operator.validation';

const router = express.Router();

const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);

router.post(
  '/admin/invite',
  adminOnly,
  validateRequest(OperatorValidation.inviteOperatorZodSchema),
  OperatorController.inviteOperator
);
router.patch(
  '/admin/:id/verify',
  adminOnly,
  OperatorController.verifyOperator
);

// Public — reached before the operator has an account
router.get('/invitation/:code', OperatorController.getInvitation);
router.post(
  '/signup',
  fileUploadHandler.fields([{ name: 'selfie', maxCount: 1 }]),
  OperatorController.operatorSignup
);

export const OperatorRouter = router;
