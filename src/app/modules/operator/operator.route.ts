import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { fileUploadHandler } from '../../middleware/fileUploadHandler';
import { OperatorController } from './operator.controller';
import { OperatorValidation } from './operator.validation';
import { OperatorCallController } from './operatorCall.controller';
import { OperatorCallValidation } from './operatorCall.validation';

const router = express.Router();

const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);
const operatorOnly = auth(USER_ROLES.OPERATOR);

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

// ============================================
// Operator call handling — queue, accept/skip, the 6-step call tracker
// ============================================
router.patch(
  '/availability',
  operatorOnly,
  validateRequest(OperatorCallValidation.setAvailabilityZodSchema),
  OperatorCallController.setAvailability
);
router.get('/queue', operatorOnly, OperatorCallController.getQueue);

router.get('/calls/history', operatorOnly, OperatorCallController.getHistory);
router.get('/calls/earnings', operatorOnly, OperatorCallController.getEarnings);
router.get(
  '/calls/performance',
  operatorOnly,
  OperatorCallController.getPerformance
);
// Registered before /calls/:id so the literal "active" segment never gets
// swallowed by the :id wildcard.
router.get(
  '/calls/active',
  operatorOnly,
  OperatorCallController.getActiveCall
);
router.get('/calls/:id', operatorOnly, OperatorCallController.getOperatorCall);

router.patch(
  '/calls/:id/accept',
  operatorOnly,
  OperatorCallController.acceptCall
);
router.patch('/calls/:id/skip', operatorOnly, OperatorCallController.skipCall);
router.patch(
  '/calls/:id/dial-customer',
  operatorOnly,
  OperatorCallController.dialCustomer
);
router.patch(
  '/calls/:id/customer-connected',
  operatorOnly,
  OperatorCallController.customerConnected
);
router.patch(
  '/calls/:id/dial-destination',
  operatorOnly,
  OperatorCallController.dialDestination
);
router.patch(
  '/calls/:id/destination-connected',
  operatorOnly,
  OperatorCallController.destinationConnected
);
router.patch(
  '/calls/:id/start-conference',
  operatorOnly,
  OperatorCallController.startConference
);
router.patch(
  '/calls/:id/end',
  operatorOnly,
  validateRequest(OperatorCallValidation.endCallZodSchema),
  OperatorCallController.endCall
);
router.patch(
  '/calls/:id/mark-failed',
  operatorOnly,
  validateRequest(OperatorCallValidation.markFailedZodSchema),
  OperatorCallController.markFailed
);

export const OperatorRouter = router;
