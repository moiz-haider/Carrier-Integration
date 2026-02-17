import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CarrierErrorFilter } from './common/carrier-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new CarrierErrorFilter());
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
