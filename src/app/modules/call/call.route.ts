import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { CallController } from './call.controller';
import { CallValidation } from './call.validation';

const router = express.Router();

const customerOnly = auth(USER_ROLES.USER);

router.post(
  '/request',
  customerOnly,
  validateRequest(CallValidation.requestCallZodSchema),
  CallController.requestCall
);
router.get('/', customerOnly, CallController.listCalls);
router.get('/:id', customerOnly, CallController.getCall);
router.patch('/:id/cancel', customerOnly, CallController.cancelCall);
router.post(
  '/:id/rating',
  customerOnly,
  validateRequest(CallValidation.rateCallZodSchema),
  CallController.rateCall
);
router.post(
  '/:id/report',
  customerOnly,
  validateRequest(CallValidation.reportCallZodSchema),
  CallController.reportCall
);

export const CallRouter = router;
