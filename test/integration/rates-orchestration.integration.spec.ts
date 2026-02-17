import { Test } from '@nestjs/testing';
import { ConfigModule, APP_CONFIG } from '../../src/config/config.module';
import { UpsModule, UPS_HTTP_CLIENT } from '../../src/carriers/ups/ups.module';
import { RatesModule } from '../../src/rates/rates.module';
import { RatesService } from '../../src/rates/rates.service';
import type { IUpsHttpClient } from '../../src/carriers/ups/ups-http.interface';
import type { AppConfig } from '../../src/config';
import { validRateRequest } from '../fixtures/rate-request';
import { upsOAuthSuccess, upsRateSuccess } from '../fixtures/ups-responses';

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

describe('RatesService orchestration (integration)', () => {
  let ratesService: RatesService;
  let mockHttp: { getToken: jest.Mock; postRate: jest.Mock };

  beforeEach(async () => {
    mockHttp = { getToken: jest.fn(), postRate: jest.fn() };
    mockHttp.getToken.mockResolvedValue(upsOAuthSuccess);
    mockHttp.postRate.mockResolvedValue(upsRateSuccess);

    const module = await Test.createTestingModule({
      imports: [ConfigModule, UpsModule, RatesModule],
    })
      .overrideProvider(APP_CONFIG)
      .useValue(mockConfig())
      .overrideProvider(UPS_HTTP_CLIENT)
      .useValue(mockHttp as unknown as IUpsHttpClient)
      .compile();

    ratesService = module.get(RatesService);
    jest.clearAllMocks();
  });

  it('uses default (first) carrier when carrierId is omitted', async () => {
    const result = await ratesService.getRates(validRateRequest);

    expect(result.carrierId).toBe('ups');
    expect(result.quotes).toHaveLength(2);
    expect(mockHttp.postRate).toHaveBeenCalledTimes(1);
  });

  it('uses requested carrier when carrierId is provided', async () => {
    const result = await ratesService.getRates({
      ...validRateRequest,
      carrierId: 'ups',
    });

    expect(result.carrierId).toBe('ups');
    expect(result.quotes).toHaveLength(2);
    expect(mockHttp.postRate).toHaveBeenCalledTimes(1);
  });

  it('throws VALIDATION_ERROR for unknown carrierId', async () => {
    await expect(
      ratesService.getRates({
        ...validRateRequest,
        carrierId: 'fedex',
      }),
    ).rejects.toMatchObject({
      details: { code: 'VALIDATION_ERROR', message: expect.stringContaining('Unknown carrier') },
    });
    expect(mockHttp.getToken).not.toHaveBeenCalled();
    expect(mockHttp.postRate).not.toHaveBeenCalled();
  });
});
