import { Injectable } from '@nestjs/common';
import { ZodError } from 'zod';
import type { RateRequest, RateResponse, RateQuote } from '../../types';
import { rateRequestSchema } from '../../domain/validation';
import { CarrierIntegrationError } from '../../common/errors';
import type { CarrierRateProvider } from '../carrier.interface';
import type { UpsAuthService } from './ups-auth.service';
import type { IUpsHttpClient } from './ups-http.interface';
import type { UpsRateRequest, UpsRateResponse, UpsRatedShipment } from './ups-api.types';
import { buildUpsRateRequest, parseUpsRateResponse } from './ups-rate.mapper';

const CARRIER_ID = 'ups';

@Injectable()
export class UpsRateService implements CarrierRateProvider {
  readonly carrierId = CARRIER_ID;

  constructor(
    private readonly auth: UpsAuthService,
    private readonly http: IUpsHttpClient,
  ) {}

  async getRates(request: RateRequest): Promise<RateResponse> {
    const parsed = this.validateRequest(request);
    const token = await this.auth.getValidToken();
    let raw: UpsRateResponse;
    try {
      raw = await this.http.postRate(token, buildUpsRateRequest(parsed));
    } catch (err) {
      if (err instanceof CarrierIntegrationError && err.details.httpStatus === 401) {
        this.auth.invalidateCache();
        const token2 = await this.auth.getValidToken();
        raw = await this.http.postRate(token2, buildUpsRateRequest(parsed));
      } else {
        throw err;
      }
    }
    const quotes = parseUpsRateResponse(raw);
    return { carrierId: CARRIER_ID, quotes };
  }

  private validateRequest(request: unknown): RateRequest {
    try {
      return rateRequestSchema.parse(request) as RateRequest;
    } catch (err) {
      if (err instanceof ZodError) {
        const msg = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new CarrierIntegrationError(
          { code: 'VALIDATION_ERROR', message: msg },
          err,
        );
      }
      throw err;
    }
  }
}
