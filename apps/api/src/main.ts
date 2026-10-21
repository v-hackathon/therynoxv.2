
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 5000);
  const corsOrigin = config.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3000',
  );

  // API version prefix
  app.setGlobalPrefix('api/v1');

  // CORS configuration
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  // Global request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Therynox Commerce OS API')
    .setDescription(
      'Versioned API documentation for the Therynox Commerce OS foundation.',
    )
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
