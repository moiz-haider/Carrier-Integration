import type { Address } from './address.types';
import type { Package } from './package.types';

export interface RateRequest {
  origin: Address;
  destination: Address;
  package: Package;
  serviceLevel?: string;
  carrierId?: string;
}

export interface RateQuote {
  serviceCode: string;
  serviceName: string;
  totalCharge: number;
  currency: string;
  estimatedTransitDays?: number;
}

export interface RateResponse {
  quotes: RateQuote[];
  carrierId: string;
}
