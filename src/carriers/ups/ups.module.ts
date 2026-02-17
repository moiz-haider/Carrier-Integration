import { Module } from '@nestjs/common';
import { APP_CONFIG } from '../../config/config.module';
import type { AppConfig } from '../../config';
import { UpsHttpClient } from './ups-http.client';
import { UpsAuthService } from './ups-auth.service';
import { UpsRateService } from './ups-rate.service';
import type { IUpsHttpClient } from './ups-http.interface';

export const UPS_HTTP_CLIENT = Symbol('UPS_HTTP_CLIENT');

@Module({
  providers: [
    {
      provide: UPS_HTTP_CLIENT,
      useFactory: (config: AppConfig) => new UpsHttpClient(config),
      inject: [APP_CONFIG],
    },
    {
      provide: UpsAuthService,
      useFactory: (http: IUpsHttpClient) => new UpsAuthService(http),
      inject: [UPS_HTTP_CLIENT],
    },
    {
      provide: UpsRateService,
      useFactory: (auth: UpsAuthService, http: IUpsHttpClient) =>
        new UpsRateService(auth, http),
      inject: [UpsAuthService, UPS_HTTP_CLIENT],
    },
  ],
  exports: [UpsRateService],
})
export class UpsModule {}
