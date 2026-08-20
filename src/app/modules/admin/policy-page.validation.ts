import { z } from 'zod';
import { POLICY_PAGE_TYPES } from './policy-page.model';

const policyPageTypeSchema = z.enum(POLICY_PAGE_TYPES);

const getPolicyPageZodSchema = z.object({
  params: z.object({
    type: policyPageTypeSchema,
  }),
});

const updatePolicyPageZodSchema = z.object({
  params: z.object({
    type: policyPageTypeSchema,
  }),
  body: z
    .object({
      title: z.string().trim().min(1).optional(),
      content: z.string().optional(),
    })
    .refine((data) => data.title !== undefined || data.content !== undefined, {
      message: 'At least one field is required',
    }),
});

const createPolicyPageZodSchema = updatePolicyPageZodSchema;

export const PolicyPageValidation = {
  getPolicyPageZodSchema,
  createPolicyPageZodSchema,
  updatePolicyPageZodSchema,
};
