import { z } from 'zod';

const otpBodySchema = z.object({
  otp: z.preprocess(
    (val) => Number(val),
    z.number().int().nonnegative({ message: 'OTP is required' })
  ),
});

const createSignupZodSchema = z.object({
  body: z.object({
    name: z.string().nonempty({ message: 'Name is required' }),
    phone: z.string().nonempty({ message: 'Phone number is required' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' }),
  }),
});

const createLoginZodSchema = z.object({
  body: z.object({
    phone: z.string().nonempty({ message: 'Phone number is required' }),
    password: z.string().nonempty({ message: 'Password is required' }),
  }),
});

const createForgetPasswordZodSchema = z.object({
  body: z.object({
    phone: z.string().nonempty({ message: 'Phone number is required' }),
  }),
});

const createResendOtpZodSchema = z.object({
  body: z.object({
    phone: z.string().nonempty({ message: 'Phone number is required' }).optional(),
  }),
});

const createResetPasswordZodSchema = z.object({
  body: z.object({
    newPassword: z.string().nonempty({ message: 'Password is required' }),
    confirmPassword: z
      .string()
      .nonempty({ message: 'Confirm Password is required' }),
  }),
});

const createChangePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z
      .string()
      .nonempty({ message: 'Current Password is required' }),
    newPassword: z.string().nonempty({ message: 'New Password is required' }),
    confirmPassword: z
      .string()
      .nonempty({ message: 'Confirm Password is required' }),
  }),
});

const createVerifyOtpZodSchema = z.object({
  body: otpBodySchema,
});

export const AuthValidation = {
  createSignupZodSchema,
  createForgetPasswordZodSchema,
  createResendOtpZodSchema,
  createLoginZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
  createVerifyOtpZodSchema,
};
