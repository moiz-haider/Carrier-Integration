import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { RatesService } from './rates.service';
import type { RateRequest, RateResponse } from '../types';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post('shop')
  @HttpCode(HttpStatus.OK)
  async getRates(@Body() body: RateRequest): Promise<RateResponse> {
    return this.ratesService.getRates(body);
  }
}
