import { z } from 'zod';

const transferMinutesZodSchema = z.object({
  body: z.object({
    toPhone: z.string().nonempty({ message: 'Recipient phone is required' }),
    minutes: z
      .number({ message: 'Minutes is required' })
      .int()
      .positive({ message: 'Minutes must be a positive whole number' }),
  }),
});

export const WalletValidation = {
  transferMinutesZodSchema,
};
