import { Module } from '@nestjs/common';
import { UpsModule } from '../carriers/ups/ups.module';
import { UpsRateService } from '../carriers/ups/ups-rate.service';
import { RatesController } from './rates.controller';
import { RatesService, CARRIER_RATE_PROVIDERS } from './rates.service';

@Module({
  imports: [UpsModule],
  controllers: [RatesController],
  providers: [
    {
      provide: CARRIER_RATE_PROVIDERS,
      useFactory: (upsRateService: UpsRateService) => [upsRateService],
      inject: [UpsRateService],
    },
    RatesService,
  ],
})
export class RatesModule {}
