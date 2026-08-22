import { z } from 'zod';

const inviteOperatorZodSchema = z.object({
  body: z.object({
    name: z.string().nonempty({ message: 'Name is required' }),
    countryCode: z.string().nonempty({ message: 'Country code is required' }),
    phone: z.string().nonempty({ message: 'Phone number is required' }),
    city: z.string().nonempty({ message: 'City is required' }),
  }),
});

const operatorSignupZodSchema = z.object({
  code: z.string().nonempty({ message: 'Invitation code is required' }),
  name: z.string().nonempty({ message: 'Name is required' }),
  countryCode: z.string().nonempty({ message: 'Country code is required' }),
  phone: z.string().nonempty({ message: 'Phone number is required' }),
  email: z.string().email().optional(),
  city: z.string().nonempty({ message: 'City is required' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
  phoneNumbers: z.array(z.string()).optional(),
});

export const OperatorValidation = {
  inviteOperatorZodSchema,
  operatorSignupZodSchema,
};
