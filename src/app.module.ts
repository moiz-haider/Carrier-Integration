import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigModule } from './config/config.module';
import { UpsModule } from './carriers/ups/ups.module';
import { RatesModule } from './rates/rates.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    ConfigModule,
    UpsModule,
    RatesModule,
  ],
})
export class AppModule {}
