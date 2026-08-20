import { z } from 'zod';
import { DESTINATION_STATUS } from '../../../enums/destination';

const createDestinationZodSchema = z.object({
  body: z.object({
    name: z.string().nonempty({ message: 'Destination name is required' }),
    prefix: z.string().nonempty({ message: 'Prefix is required' }),
    customerRatePerMin: z
      .number({ message: 'Customer rate is required' })
      .nonnegative(),
    operatorPayoutPerMin: z
      .number({ message: 'Operator payout is required' })
      .nonnegative(),
    status: z.nativeEnum(DESTINATION_STATUS).optional(),
  }),
});

const updateDestinationZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    prefix: z.string().optional(),
    customerRatePerMin: z.number().nonnegative().optional(),
    operatorPayoutPerMin: z.number().nonnegative().optional(),
  }),
});

const updateDestinationStatusZodSchema = z.object({
  body: z.object({
    status: z.nativeEnum(DESTINATION_STATUS, {
      message: 'Status must be active or disabled',
    }),
  }),
});

const upsertExchangeRateZodSchema = z.object({
  params: z.object({
    currency: z.string().nonempty(),
  }),
  body: z.object({
    rate: z.number({ message: 'Rate is required' }).positive(),
  }),
});

export const DestinationValidation = {
  createDestinationZodSchema,
  updateDestinationZodSchema,
  updateDestinationStatusZodSchema,
  upsertExchangeRateZodSchema,
};
