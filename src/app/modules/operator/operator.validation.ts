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

const suspendOperatorZodSchema = z.object({
  body: z.object({
    reason: z.string().nonempty({ message: 'A reason is required' }),
  }),
});

// Same shape as signup — sent as the JSON-encoded "data" field alongside the
// optional image file, parsed and validated by hand in the controller (not
// via validateRequest, since the real body lives inside that one string field).
const updateOwnProfileZodSchema = z.object({
  city: z.string().nonempty({ message: 'City is required' }).optional(),
  phoneNumbers: z.array(z.string()).optional(),
});

export const OperatorValidation = {
  inviteOperatorZodSchema,
  operatorSignupZodSchema,
  suspendOperatorZodSchema,
  updateOwnProfileZodSchema,
};
