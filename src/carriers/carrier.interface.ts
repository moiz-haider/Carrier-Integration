import type { RateRequest, RateResponse } from '../types';

export interface CarrierRateProvider {
  readonly carrierId: string;
  getRates(request: RateRequest): Promise<RateResponse>;
}

export interface CarrierAuthToken {
  accessToken: string;
  expiresAt: number;
}
