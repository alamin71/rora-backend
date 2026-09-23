import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { CallController } from './call.controller';
import { CallValidation } from './call.validation';

const router = express.Router();

const customerOnly = auth(USER_ROLES.USER);
const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);

router.post(
  '/request',
  customerOnly,
  validateRequest(CallValidation.requestCallZodSchema),
  CallController.requestCall
);

// Admin — registered before the customerOnly /:id below so the literal
// "admin" segment never gets swallowed by the :id wildcard.
router.get('/admin/stats', adminOnly, CallController.getCallStatsAdmin);
router.get('/admin/export', adminOnly, CallController.exportCallsCsv);
router.get('/admin', adminOnly, CallController.listCallsAdmin);

router.get('/', customerOnly, CallController.listCalls);
router.get('/:id', customerOnly, CallController.getCall);
router.patch('/:id/cancel', customerOnly, CallController.cancelCall);
router.patch('/:id/redial', customerOnly, CallController.redialCall);
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
