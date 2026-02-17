import type { UpsOAuthTokenResponse } from './ups-api.types';
import type { UpsRateRequest, UpsRateResponse } from './ups-api.types';

export interface IUpsHttpClient {
  getToken(): Promise<UpsOAuthTokenResponse>;
  postRate(accessToken: string, body: UpsRateRequest): Promise<UpsRateResponse>;
}
