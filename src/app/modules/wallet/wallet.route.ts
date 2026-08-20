import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { WalletController } from './wallet.controller';
import { WalletValidation } from './wallet.validation';

const router = express.Router();

// Wallets belong to customers — operators earn money (tracked separately),
// not minutes, and admins/super admins have no wallet of their own.
router.get('/balance', auth(USER_ROLES.USER), WalletController.getBalance);
router.get(
  '/transactions',
  auth(USER_ROLES.USER),
  WalletController.getTransactions
);
router.post(
  '/transfer',
  auth(USER_ROLES.USER),
  validateRequest(WalletValidation.transferMinutesZodSchema),
  WalletController.transfer
);

export const WalletRouter = router;
