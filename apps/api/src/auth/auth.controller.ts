
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsUrl,
  Length,
} from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';
import type { Request } from 'express';

class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'Password must include uppercase, lowercase, a number, and a special character',
  })
  password!: string;
}

class GoogleLoginDto {
  @IsString()
  @MinLength(20)
  @MaxLength(10000)
  credential!: string;
}

class AuthIdentifierDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  identifier?: string;
}

class OtpRequestDto extends AuthIdentifierDto {}

class OtpVerifyDto extends AuthIdentifierDto {
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'OTP must be six digits' })
  code!: string;
}

class LoginDto extends AuthIdentifierDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}

class SellerApplicationDto {
  @IsString() @MinLength(2) @MaxLength(120)
  businessName!: string;

  @IsString() @MinLength(2) @MaxLength(120)
  legalName!: string;

  @IsString() @IsIn(['INDIVIDUAL', 'SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'OTHER'])
  businessType!: 'INDIVIDUAL' | 'SOLE_PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'OTHER';

  @IsOptional() @IsString() @MaxLength(25)
  phone?: string;

  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(255)
  website?: string;

  @IsString() @MinLength(5) @MaxLength(180)
  addressLine1!: string;

  @IsString() @MinLength(2) @MaxLength(100)
  city!: string;

  @IsString() @MinLength(2) @MaxLength(100)
  state!: string;

  @IsString() @Length(5, 10) @Matches(/^[A-Za-z0-9 -]+$/)
  postalCode!: string;

  @IsOptional() @IsString() @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i, { message: 'GSTIN format is invalid' })
  gstin?: string;
}

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a Google ID token and sign in to Therynox' })
  googleLogin(@Body() body: GoogleLoginDto) {
    return this.authService.loginWithGoogle(body.credential);
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a one-time email sign-in code' })
  requestLoginOtp(@Body() body: OtpRequestDto) {
    return this.authService.requestLoginOtp(body.identifier ?? body.email ?? '');
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a one-time email sign-in code and receive an access token' })
  verifyLoginOtp(@Body() body: OtpVerifyDto) {
    return this.authService.verifyLoginOtp(body.identifier ?? body.email ?? '', body.code);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive a JWT access token' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  getMe(@Req() req: AuthenticatedRequest) {
    return this.authService.getCurrentUser(req.user.userId);
  }

  @Post('seller/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply for seller status' })
  applyForSeller(@Req() req: AuthenticatedRequest, @Body() body: SellerApplicationDto) {
    return this.authService.applyForSeller(req.user.userId, body);
  }
}
