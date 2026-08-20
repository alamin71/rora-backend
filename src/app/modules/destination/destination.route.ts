import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { DestinationController } from './destination.controller';
import { DestinationValidation } from './destination.validation';

const router = express.Router();

const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);

// Customer-facing — active destinations for the dial screen
router.get('/', auth(USER_ROLES.USER), DestinationController.getActiveDestinations);

// Exchange rates registered before /admin/:id so a literal segment never
// gets swallowed by the :id wildcard
router.get(
  '/admin/exchange-rates',
  adminOnly,
  DestinationController.getExchangeRates
);
router.patch(
  '/admin/exchange-rates/:currency',
  adminOnly,
  validateRequest(DestinationValidation.upsertExchangeRateZodSchema),
  DestinationController.upsertExchangeRate
);

router.get('/admin', adminOnly, DestinationController.getAllDestinationsAdmin);
router.post(
  '/admin',
  adminOnly,
  validateRequest(DestinationValidation.createDestinationZodSchema),
  DestinationController.createDestination
);
router.patch(
  '/admin/:id',
  adminOnly,
  validateRequest(DestinationValidation.updateDestinationZodSchema),
  DestinationController.updateDestination
);
router.patch(
  '/admin/:id/status',
  adminOnly,
  validateRequest(DestinationValidation.updateDestinationStatusZodSchema),
  DestinationController.updateDestinationStatus
);
router.delete('/admin/:id', adminOnly, DestinationController.deleteDestination);

export const DestinationRouter = router;
