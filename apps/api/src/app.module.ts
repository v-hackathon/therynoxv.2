
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { HealthModule } from './health/health.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'staging', 'production')
          .default('development'),
        PORT: Joi.number().port().default(5000),
        CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        OTP_HASH_SECRET: Joi.string().min(32).optional(),
        RESEND_API_KEY: Joi.string().allow('').optional(),
        AUTH_EMAIL_FROM: Joi.string().allow('').optional(),
        GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
        SMTP_HOST: Joi.string().allow('').optional(),
        SMTP_PORT: Joi.number().port().default(587),
        SMTP_USER: Joi.string().allow('').optional(),
        SMTP_PASS: Joi.string().allow('').optional(),
      }),
    }),
    HealthModule,
    AuthModule,
    ProductsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
