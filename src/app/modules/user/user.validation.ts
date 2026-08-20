import { z } from 'zod';

const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    image: z.string().optional(),
  }),
});

export const UserValidation = {
  updateUserZodSchema,
};
