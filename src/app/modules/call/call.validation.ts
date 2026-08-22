import { z } from 'zod';

const requestCallZodSchema = z.object({
  body: z.object({
    destinationId: z.string().nonempty({ message: 'Destination is required' }),
    numberDialed: z.string().nonempty({ message: 'Number is required' }),
  }),
});

const rateCallZodSchema = z.object({
  body: z.object({
    stars: z.number().int().min(1).max(5),
    tags: z.array(z.string()).optional(),
    comment: z.string().optional(),
  }),
});

const reportCallZodSchema = z.object({
  body: z.object({
    reason: z.string().nonempty({ message: 'Reason is required' }),
  }),
});

export const CallValidation = {
  requestCallZodSchema,
  rateCallZodSchema,
  reportCallZodSchema,
};
