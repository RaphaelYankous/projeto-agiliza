import { ClassSerializerInterceptor, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor.js';

export function configurarApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      transformOptions: { exposeUnsetFields: false },
    }),
  );
  app.useGlobalFilters(new I18nValidationExceptionFilter({ detailedErrors: false }));
  app.useGlobalInterceptors(
    new TimeoutInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
}
