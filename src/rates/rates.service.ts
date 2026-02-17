import { Injectable, Inject } from '@nestjs/common';
import type { RateRequest, RateResponse } from '../types';
import type { CarrierRateProvider } from '../carriers/carrier.interface';
import { CarrierIntegrationError } from '../common/errors';

export const CARRIER_RATE_PROVIDERS = Symbol('CARRIER_RATE_PROVIDERS');

@Injectable()
export class RatesService {
  constructor(
    @Inject(CARRIER_RATE_PROVIDERS)
    private readonly carriers: CarrierRateProvider[],
  ) {}

  async getRates(request: RateRequest): Promise<RateResponse> {
    const provider = this.selectProvider(request.carrierId);
    return provider.getRates(request);
  }

  private selectProvider(carrierId?: string): CarrierRateProvider {
    if (this.carriers.length === 0) {
      throw new CarrierIntegrationError({
        code: 'CARRIER_SERVER_ERROR',
        message: 'No carrier rate providers configured.',
      });
    }
    if (carrierId) {
      const found = this.carriers.find(
        (c) => c.carrierId.toLowerCase() === carrierId.toLowerCase(),
      );
      if (!found) {
        throw new CarrierIntegrationError({
          code: 'VALIDATION_ERROR',
          message: `Unknown carrier: ${carrierId}. Available: ${this.carriers.map((c) => c.carrierId).join(', ')}`,
        });
      }
      return found;
    }
    return this.carriers[0];
  }
}
