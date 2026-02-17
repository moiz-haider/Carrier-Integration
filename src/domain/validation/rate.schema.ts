import { z } from 'zod';
import { addressSchema } from './address.schema';
import { packageSchema } from './package.schema';

export const rateRequestSchema = z.object({
  origin: addressSchema,
  destination: addressSchema,
  package: packageSchema,
  serviceLevel: z.string().max(50).optional(),
  carrierId: z.string().min(1).max(50).optional(),
});

export type RateRequestInput = z.infer<typeof rateRequestSchema>;
