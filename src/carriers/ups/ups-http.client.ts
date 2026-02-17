import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import type { AppConfig } from '../../config';
import {
  CarrierIntegrationError,
  type CarrierErrorCode,
} from '../../common/errors';
import type { UpsRateRequest, UpsRateResponse } from './ups-api.types';
import type { UpsOAuthTokenResponse } from './ups-api.types';
import type { IUpsHttpClient } from './ups-http.interface';

@Injectable()
export class UpsHttpClient implements IUpsHttpClient {
  private readonly axios: AxiosInstance;
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.axios = axios.create({
      timeout: config.http.timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getToken(): Promise<UpsOAuthTokenResponse> {
    const url = `${this.config.ups.baseUrl}${this.config.ups.oauthTokenPath}`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
    }).toString();

    try {
      const response = await this.axios.post<UpsOAuthTokenResponse>(url, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${this.config.ups.clientId}:${this.config.ups.clientSecret}`,
          ).toString('base64')}`,
        },
        timeout: this.config.http.timeoutMs,
      });
      return response.data;
    } catch (err: unknown) {
      throw this.wrapHttpError(err, url, 'getToken');
    }
  }

  async postRate(
    accessToken: string,
    body: UpsRateRequest,
  ): Promise<UpsRateResponse> {
    const url = `${this.config.ups.baseUrl}/api/rating/v1/Shop`;
    try {
      const response = await this.axios.post<UpsRateResponse>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: this.config.http.rateRequestTimeoutMs,
      });
      return response.data;
    } catch (err: unknown) {
      throw this.wrapHttpError(err, url, 'postRate');
    }
  }

  private wrapHttpError(
    err: unknown,
    url: string,
    operation: string,
  ): CarrierIntegrationError {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const code = this.statusToErrorCode(status);
      const message =
        err.response?.data?.message ??
        err.message ??
        `${operation} failed`;
      const carrierContext =
        typeof err.response?.data === 'object'
          ? JSON.stringify(err.response.data).slice(0, 500)
          : undefined;
      return new CarrierIntegrationError(
        {
          code,
          message: `${operation}: ${message}`,
          httpStatus: status,
          carrierContext,
        },
        err,
      );
    }
    if (err instanceof Error) {
      const isTimeout =
        err.message?.toLowerCase().includes('timeout') ?? false;
      return new CarrierIntegrationError(
        {
          code: isTimeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR',
          message: err.message,
        },
        err,
      );
    }
    return new CarrierIntegrationError(
      { code: 'UNKNOWN', message: String(err) },
      err,
    );
  }

  private statusToErrorCode(status?: number): CarrierErrorCode {
    if (status === 401) return 'AUTH_FAILED';
    if (status === 429) return 'RATE_LIMITED';
    if (status && status >= 500) return 'CARRIER_SERVER_ERROR';
    if (status && status >= 400) return 'CARRIER_CLIENT_ERROR';
    return 'NETWORK_ERROR';
  }
}
