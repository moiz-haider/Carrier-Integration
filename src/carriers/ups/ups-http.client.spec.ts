import axios from 'axios';
import { CarrierIntegrationError } from '../../common/errors';
import { UpsHttpClient } from './ups-http.client';
import type { AppConfig } from '../../config';

const config: AppConfig = {
  http: { timeoutMs: 5000, rateRequestTimeoutMs: 10000 },
  ups: {
    baseUrl: 'https://onlinetools.ups.com',
    oauthTokenPath: '/security/v1/oauth/token',
    clientId: 'test',
    clientSecret: 'secret',
  },
};

describe('UpsHttpClient', () => {
  it('wraps 401 axios error as AUTH_FAILED', async () => {
    const client = new UpsHttpClient(config);
    jest.spyOn(client['axios'], 'post').mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        isAxiosError: true,
        response: { status: 401 },
      }),
    );

    await expect(client.getToken()).rejects.toMatchObject({
      details: { code: 'AUTH_FAILED', httpStatus: 401 },
    });
  });

  it('wraps 503 as CARRIER_SERVER_ERROR', async () => {
    const client = new UpsHttpClient(config);
    jest.spyOn(client['axios'], 'post').mockRejectedValue(
      Object.assign(new Error('Service Unavailable'), {
        isAxiosError: true,
        response: { status: 503 },
      }),
    );

    await expect(client.postRate('token', {} as any)).rejects.toMatchObject({
      details: { code: 'CARRIER_SERVER_ERROR', httpStatus: 503 },
    });
  });
});
