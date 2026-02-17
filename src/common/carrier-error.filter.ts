import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { CarrierIntegrationError } from './errors';

@Catch(CarrierIntegrationError)
export class CarrierErrorFilter implements ExceptionFilter {
  catch(exception: CarrierIntegrationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status =
      exception.details.httpStatus &&
      exception.details.httpStatus >= 400 &&
      exception.details.httpStatus < 600
        ? exception.details.httpStatus
        : HttpStatus.BAD_GATEWAY;
    res.status(status).json({
      error: {
        code: exception.details.code,
        message: exception.details.message,
      },
    });
  }
}
