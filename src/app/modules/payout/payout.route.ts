import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { PayoutController } from './payout.controller';
import { PayoutValidation } from './payout.validation';

const router = express.Router();

const operatorOnly = auth(USER_ROLES.OPERATOR);
const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);

router.post(
  '/request',
  operatorOnly,
  validateRequest(PayoutValidation.requestPayoutZodSchema),
  PayoutController.requestPayout
);
router.get('/mine', operatorOnly, PayoutController.getMyPayouts);

router.get('/admin/stats', adminOnly, PayoutController.getPayoutStats);
router.get('/admin', adminOnly, PayoutController.listAllPayouts);
router.patch('/admin/:id/approve', adminOnly, PayoutController.approvePayout);
router.patch('/admin/:id/mark-paid', adminOnly, PayoutController.markPaid);
router.patch(
  '/admin/:id/reject',
  adminOnly,
  validateRequest(PayoutValidation.rejectPayoutZodSchema),
  PayoutController.rejectPayout
);

export const PayoutRouter = router;
