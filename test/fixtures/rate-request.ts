import type { RateRequest } from '../../src/types';

export const validRateRequest: RateRequest = {
  origin: {
    lines: ['123 Main St'],
    city: 'San Francisco',
    stateOrProvinceCode: 'CA',
    postalCode: '94102',
    countryCode: 'US',
  },
  destination: {
    lines: ['456 Oak Ave'],
    city: 'Los Angeles',
    stateOrProvinceCode: 'CA',
    postalCode: '90001',
    countryCode: 'US',
  },
  package: {
    weightKg: 5.5,
    dimensions: { lengthCm: 30, widthCm: 20, heightCm: 15 },
  },
};
