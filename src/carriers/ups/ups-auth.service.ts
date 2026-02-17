import { Injectable } from '@nestjs/common';
import type { CarrierAuthToken } from '../carrier.interface';
import { CarrierIntegrationError } from '../../common/errors';
import type { IUpsHttpClient } from './ups-http.interface';

const REFRESH_BUFFER_MS = 60 * 1000;

@Injectable()
export class UpsAuthService {
  private cached: { token: CarrierAuthToken } | null = null;

  constructor(private readonly http: IUpsHttpClient) {}

  async getValidToken(): Promise<string> {
    const now = Date.now();
    if (this.cached && this.cached.token.expiresAt > now + REFRESH_BUFFER_MS) {
      return this.cached.token.accessToken;
    }
    const fresh = await this.acquireToken();
    this.cached = { token: fresh };
    return fresh.accessToken;
  }

  private async acquireToken(): Promise<CarrierAuthToken> {
    try {
      const res = await this.http.getToken();
      const expiresInMs = (res.expires_in ?? 3600) * 1000;
      return {
        accessToken: res.access_token,
        expiresAt: Date.now() + expiresInMs,
      };
    } catch (err) {
      if (err instanceof CarrierIntegrationError) {
        if (err.details.code === 'AUTH_FAILED' || err.details.code === 'CARRIER_CLIENT_ERROR') {
          throw new CarrierIntegrationError(
            { ...err.details, code: 'AUTH_FAILED', message: 'UPS authentication failed. Check client credentials.' },
            err,
          );
        }
        throw err;
      }
      throw new CarrierIntegrationError(
        { code: 'AUTH_FAILED', message: 'Failed to acquire UPS token' },
        err,
      );
    }
  }

  invalidateCache(): void {
    this.cached = null;
  }
}
