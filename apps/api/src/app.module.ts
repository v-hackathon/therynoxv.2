
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
