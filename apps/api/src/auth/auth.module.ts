
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt-strategy/jwt-strategy.service';
import { AdminTestController } from './admin-test.controller';
import { RolesGuard } from './roles.guard';
import { AdminSellersController } from './admin-sellers.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
controllers: [AuthController, AdminTestController, AdminSellersController],
providers: [AuthService, PrismaService, JwtStrategy, RolesGuard],
})
export class AuthModule {}
