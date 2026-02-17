import { z } from 'zod';

const packageDimensionSchema = z.object({
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
});

export const packageSchema = z.object({
  weightKg: z.number().positive(),
  dimensions: packageDimensionSchema.optional(),
});

export type PackageInput = z.infer<typeof packageSchema>;
