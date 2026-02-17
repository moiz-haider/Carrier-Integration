import { Test } from '@nestjs/testing';
import { ConfigModule, APP_CONFIG } from '../../src/config/config.module';
import { UpsModule, UPS_HTTP_CLIENT } from '../../src/carriers/ups/ups.module';
import { UpsRateService } from '../../src/carriers/ups/ups-rate.service';
import { UpsAuthService } from '../../src/carriers/ups/ups-auth.service';
import type { IUpsHttpClient } from '../../src/carriers/ups/ups-http.interface';
import { CarrierIntegrationError } from '../../src/common/errors';
import type { AppConfig } from '../../src/config';
import { validRateRequest } from '../fixtures/rate-request';
import {
  upsOAuthSuccess,
  upsRateSuccess,
  upsRateSingle,
  upsRateMalformed,
  upsRateEmptyRatedShipment,
} from '../fixtures/ups-responses';

function mockConfig(): AppConfig {
  return {
    http: { timeoutMs: 5000, rateRequestTimeoutMs: 10000 },
    ups: {
      baseUrl: 'https://onlinetools.ups.com',
      oauthTokenPath: '/security/v1/oauth/token',
      clientId: 'test_client',
      clientSecret: 'test_secret',
    },
  };
}

describe('UpsRateService (integration)', () => {
  let rateService: UpsRateService;
  let authService: UpsAuthService;
  let mockHttp: {
    getToken: jest.Mock;
    postRate: jest.Mock;
  };

  beforeEach(async () => {
    mockHttp = { getToken: jest.fn(), postRate: jest.fn() };

    const module = await Test.createTestingModule({
      imports: [ConfigModule, UpsModule],
    })
      .overrideProvider(APP_CONFIG)
      .useValue(mockConfig())
      .overrideProvider(UPS_HTTP_CLIENT)
      .useValue(mockHttp as unknown as IUpsHttpClient)
      .compile();

    rateService = module.get(UpsRateService);
    authService = module.get(UpsAuthService);
    jest.clearAllMocks();
  });

  describe('request building and response parsing', () => {
    it('builds correct UPS request from domain and returns normalized quotes', async () => {
      mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
      mockHttp.postRate.mockResolvedValue(upsRateSuccess);

      const result = await rateService.getRates(validRateRequest);

      expect(result.carrierId).toBe('ups');
      expect(result.quotes).toHaveLength(2);

      const ground = result.quotes.find((q) => q.serviceCode === '03');
      expect(ground).toBeDefined();
      expect(ground?.serviceName).toBe('Ground');
      expect(ground?.totalCharge).toBe(24.5);
      expect(ground?.currency).toBe('USD');
      expect(ground?.estimatedTransitDays).toBe(5);

      const secondDay = result.quotes.find((q) => q.serviceCode === '02');
      expect(secondDay?.totalCharge).toBe(42);
      expect(secondDay?.estimatedTransitDays).toBe(2);

      expect(mockHttp.postRate).toHaveBeenCalledTimes(1);
      const [token, body] = mockHttp.postRate.mock.calls[0];
      expect(token).toBe('test_token_abc123');
      expect(body.RateRequest.Shipment.ShipTo.Address.City).toBe('Los Angeles');
      expect(body.RateRequest.Shipment.Package[0].SimpleWeight.Weight).toBe('5.5');
    });

    it('parses single RatedShipment (non-array) correctly', async () => {
      mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
      mockHttp.postRate.mockResolvedValue(upsRateSingle);

      const result = await rateService.getRates(validRateRequest);

      expect(result.quotes).toHaveLength(1);
      expect(result.quotes[0].serviceCode).toBe('01');
      expect(result.quotes[0].totalCharge).toBe(89.99);
      expect(result.quotes[0].estimatedTransitDays).toBe(1);
    });
  });

  describe('auth token lifecycle', () => {
    it('acquires token on first call and reuses on second', async () => {
      mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
      mockHttp.postRate.mockResolvedValue(upsRateSuccess);

      await rateService.getRates(validRateRequest);
      await rateService.getRates(validRateRequest);

      expect(mockHttp.getToken).toHaveBeenCalledTimes(1);
      expect(mockHttp.postRate).toHaveBeenCalledTimes(2);
    });

    it('refreshes token on 401 and retries rate request', async () => {
      mockHttp.getToken
        .mockResolvedValueOnce(upsOAuthSuccess)
        .mockResolvedValueOnce({ ...upsOAuthSuccess, access_token: 'new_token' });
      mockHttp.postRate
        .mockRejectedValueOnce(
          new CarrierIntegrationError(
            { code: 'AUTH_FAILED', message: 'Unauthorized', httpStatus: 401 },
          ),
        )
        .mockResolvedValueOnce(upsRateSuccess);

      const result = await rateService.getRates(validRateRequest);

      expect(result.quotes).toHaveLength(2);
      expect(mockHttp.getToken).toHaveBeenCalledTimes(2);
      expect(mockHttp.postRate).toHaveBeenCalledTimes(2);
      expect(mockHttp.postRate.mock.calls[1][0]).toBe('new_token');
    });
  });

  describe('error handling', () => {
    it('throws structured error on 4xx from rate API', async () => {
      mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
      mockHttp.postRate.mockRejectedValue(
        new CarrierIntegrationError({
          code: 'CARRIER_CLIENT_ERROR',
          message: 'Bad request',
          httpStatus: 400,
        }),
      );

      await expect(rateService.getRates(validRateRequest)).rejects.toThrow(
        CarrierIntegrationError,
      );
      await expect(rateService.getRates(validRateRequest)).rejects.toMatchObject({
        details: { code: 'CARRIER_CLIENT_ERROR', httpStatus: 400 },
      });
    });

    it('throws structured error on 5xx', async () => {
      mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
      mockHttp.postRate.mockRejectedValue(
        new CarrierIntegrationError({
          code: 'CARRIER_SERVER_ERROR',
          message: 'Server error',
          httpStatus: 503,
        }),
      );

      await expect(rateService.getRates(validRateRequest)).rejects.toMatchObject({
        details: { code: 'CARRIER_SERVER_ERROR', httpStatus: 503 },
      });
    });

    it('throws BAD_RESPONSE when RatedShipment is missing', async () => {
      mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
      mockHttp.postRate.mockResolvedValue(upsRateMalformed);

      await expect(rateService.getRates(validRateRequest)).rejects.toMatchObject({
        details: { code: 'BAD_RESPONSE' },
      });
    });

    it('returns empty quotes when RatedShipment is empty array', async () => {
      mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
      mockHttp.postRate.mockResolvedValue(upsRateEmptyRatedShipment);

      const result = await rateService.getRates(validRateRequest);
      expect(result.quotes).toEqual([]);
    });

    it('throws VALIDATION_ERROR for invalid request', async () => {
      await expect(
        rateService.getRates({
          ...validRateRequest,
          origin: { ...validRateRequest.origin, countryCode: '' },
        }),
      ).rejects.toMatchObject({
        details: { code: 'VALIDATION_ERROR' },
      });
      expect(mockHttp.getToken).not.toHaveBeenCalled();
    });

    it('throws NETWORK_TIMEOUT when rate request times out and does not retry', async () => {
      mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
      mockHttp.postRate.mockRejectedValue(
        new CarrierIntegrationError({
          code: 'NETWORK_TIMEOUT',
          message: 'timeout of 5000ms exceeded',
        }),
      );

      await expect(rateService.getRates(validRateRequest)).rejects.toMatchObject({
        details: { code: 'NETWORK_TIMEOUT' },
      });
      expect(mockHttp.getToken).toHaveBeenCalledTimes(1);
      expect(mockHttp.postRate).toHaveBeenCalledTimes(1);
    });
  });
});
