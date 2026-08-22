import { z } from 'zod';

const createLoginZodSchema = z.object({
  body: z.object({
    countryCode: z.string().nonempty({ message: 'Country code is required' }),
    phone: z.string().nonempty({ message: 'Phone number is required' }),
    password: z.string().nonempty({ message: 'Password is required' }),
  }),
});

const createForgetPasswordZodSchema = z.object({
  body: z.object({
    countryCode: z.string().nonempty({ message: 'Country code is required' }),
    phone: z.string().nonempty({ message: 'Phone number is required' }),
  }),
});

const createResendOtpZodSchema = z.object({
  body: z.object({
    countryCode: z.string().nonempty({ message: 'Country code is required' }),
    phone: z.string().nonempty({ message: 'Phone number is required' }),
  }),
});

const createVerifyResetOtpZodSchema = z.object({
  body: z.object({
    otp: z.preprocess(
      (val) => Number(val),
      z.number().int().nonnegative({ message: 'OTP is required' })
    ),
  }),
});

const createChangePasswordZodSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string()
        .nonempty({ message: 'Current password is required' }),
      newPassword: z.string().nonempty({ message: 'New password is required' }),
      confirmPassword: z
        .string()
        .nonempty({ message: 'Confirm password is required' }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
});

const createResetPasswordZodSchema = z.object({
  body: z
    .object({
      newPassword: z.string().nonempty({ message: 'New password is required' }),
      confirmPassword: z
        .string()
        .nonempty({ message: 'Confirm password is required' }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
});

export const AdminValidation = {
  createLoginZodSchema,
  createForgetPasswordZodSchema,
  createResendOtpZodSchema,
  createVerifyResetOtpZodSchema,
  createChangePasswordZodSchema,
  createResetPasswordZodSchema,
};
