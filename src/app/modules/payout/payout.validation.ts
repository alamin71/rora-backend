import { z } from 'zod';
import { PAYOUT_METHOD } from '../../../enums/payout';

const requestPayoutZodSchema = z.object({
  body: z.object({
    amountMoney: z.number().positive({ message: 'Amount must be greater than 0' }),
    method: z.nativeEnum(PAYOUT_METHOD),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
  }),
});

const rejectPayoutZodSchema = z.object({
  body: z.object({
    reason: z.string().nonempty({ message: 'A reason is required' }),
  }),
});

export const PayoutValidation = {
  requestPayoutZodSchema,
  rejectPayoutZodSchema,
};
