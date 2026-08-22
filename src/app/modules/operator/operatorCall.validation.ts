import { z } from 'zod';
import { CALL_FAILURE_REASON } from '../../../enums/call';
import { OPERATOR_AVAILABILITY } from '../../../enums/operator';

const setAvailabilityZodSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OPERATOR_AVAILABILITY),
  }),
});

const endCallZodSchema = z.object({
  body: z.object({
    operatorSimUsed: z.string().optional(),
  }),
});

const markFailedZodSchema = z.object({
  body: z.object({
    failureReason: z.nativeEnum(CALL_FAILURE_REASON),
  }),
});

export const OperatorCallValidation = {
  setAvailabilityZodSchema,
  endCallZodSchema,
  markFailedZodSchema,
};
