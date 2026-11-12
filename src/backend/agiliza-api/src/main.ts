import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import { configurarApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    routeConflictPolicy: { duplicate: 'error', shadow: 'warn' },
  });

  configurarApp(app);

  const origensPermitidas = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origem) => origem.trim());
  app.enableCors({ origin: origensPermitidas });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Agiliza API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerOptions: SwaggerDocumentOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  };

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig, swaggerOptions);

  SwaggerModule.setup('swagger', app, documentFactory, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
