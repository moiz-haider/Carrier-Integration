import { z } from 'zod';

export const addressSchema = z.object({
  lines: z.array(z.string().min(1)).min(1).max(3),
  city: z.string().min(1).max(100),
  stateOrProvinceCode: z.string().length(2),
  postalCode: z.string().min(1).max(20),
  countryCode: z.string().length(2),
});

export type AddressInput = z.infer<typeof addressSchema>;
