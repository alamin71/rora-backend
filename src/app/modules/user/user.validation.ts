import { z } from 'zod';

const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    image: z.string().optional(),
  }),
});

const createCustomerByAdminZodSchema = z.object({
  body: z.object({
    name: z.string().nonempty({ message: 'Name is required' }),
    countryCode: z.string().nonempty({ message: 'Country code is required' }),
    phone: z.string().nonempty({ message: 'Phone number is required' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' }),
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
  createCustomerByAdminZodSchema,
  suspendCustomerZodSchema,
  markAsDistributorZodSchema,
  rejectKycZodSchema,
};
