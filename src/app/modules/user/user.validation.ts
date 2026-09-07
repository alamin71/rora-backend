import { z } from 'zod';

const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    image: z.string().optional(),
  }),
});

const suspendCustomerZodSchema = z.object({
  body: z.object({
    reason: z.string().nonempty({ message: 'A reason is required' }),
  }),
});

const markAsDistributorZodSchema = z.object({
  body: z.object({
    monthlyIssuanceLimit: z.number().positive().optional(),
    commissionRatePercent: z.number().min(0).max(100).optional(),
  }),
});

const rejectKycZodSchema = z.object({
  body: z.object({
    reason: z.string().nonempty({ message: 'A reason is required' }),
  }),
});

export const UserValidation = {
  updateUserZodSchema,
  suspendCustomerZodSchema,
  markAsDistributorZodSchema,
  rejectKycZodSchema,
};
