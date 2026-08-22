import { z } from 'zod';

const resolveDisputeZodSchema = z.object({
  body: z.object({
    refundAmount: z.number().nonnegative().optional(),
    adminNote: z.string().optional(),
  }),
});

const rejectDisputeZodSchema = z.object({
  body: z.object({
    adminNote: z.string().optional(),
  }),
});

export const DisputeValidation = {
  resolveDisputeZodSchema,
  rejectDisputeZodSchema,
};
