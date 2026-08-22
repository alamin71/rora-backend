import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { DisputeController } from './dispute.controller';
import { DisputeValidation } from './dispute.validation';

const router = express.Router();

const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);

router.get('/stats', adminOnly, DisputeController.getDisputeStats);
router.get('/', adminOnly, DisputeController.listDisputes);
router.get('/:id', adminOnly, DisputeController.getDispute);
router.patch(
  '/:id/resolve',
  adminOnly,
  validateRequest(DisputeValidation.resolveDisputeZodSchema),
  DisputeController.resolveDispute
);
router.patch(
  '/:id/reject',
  adminOnly,
  validateRequest(DisputeValidation.rejectDisputeZodSchema),
  DisputeController.rejectDispute
);

export const DisputeRouter = router;
