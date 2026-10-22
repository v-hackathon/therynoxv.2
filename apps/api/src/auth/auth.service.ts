
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import {
  createHmac,
  randomInt,
  createPublicKey,
  verify as verifySignature,
  randomBytes,
} from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}


  private googleJwksCache: { expiresAt: number; keys: Array<Record<string, unknown>> } | null = null;

  private createTherynoxId() {
    // 40 bits of randomness, with ambiguous characters removed for easier reading.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 8; i++) suffix += alphabet[randomInt(0, alphabet.length)];
    return `THY-${suffix}`;
  }

  private async findUserByIdentifier(rawIdentifier: string) {
    const identifier = rawIdentifier.trim();
    if (!identifier) throw new BadRequestException('Enter your email address or Therynox ID.');
    if (identifier.includes('@')) {
      return this.prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
    }
    return this.prisma.user.findUnique({ where: { therynoxId: identifier.toUpperCase() } });
  }

  private async getGoogleSigningKey(kid: string) {
    const now = Date.now();
    if (!this.googleJwksCache || this.googleJwksCache.expiresAt <= now) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (!response?.ok) throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
      const payload = await response.json().catch(() => null) as { keys?: Array<Record<string, unknown>> } | null;
      if (!payload?.keys?.length) throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
      this.googleJwksCache = { keys: payload.keys, expiresAt: now + 60 * 60 * 1000 };
    }
    const key = this.googleJwksCache.keys.find((candidate) => candidate.kid === kid && candidate.kty === 'RSA');
    if (!key) {
      // Refresh once when Google rotates its signing key, then fail closed if it remains unknown.
      this.googleJwksCache = null;
      const refreshed = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (!refreshed?.ok) throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
      const payload = await refreshed.json().catch(() => null) as { keys?: Array<Record<string, unknown>> } | null;
      if (!payload?.keys?.length) throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
      this.googleJwksCache = { keys: payload.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
      const rotatedKey = this.googleJwksCache.keys.find((candidate) => candidate.kid === kid && candidate.kty === 'RSA');
      if (!rotatedKey) throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
      return createPublicKey({ key: rotatedKey as unknown as import('node:crypto').JsonWebKey, format: 'jwk' });
    }
    return createPublicKey({ key: key as unknown as import('node:crypto').JsonWebKey, format: 'jwk' });
  }

  private async verifyGoogleIdToken(credential: string): Promise<{ email: string; name: string; subject: string }> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new BadRequestException('Google sign-in is not configured. Set GOOGLE_CLIENT_ID in apps/api/.env.');
    const parts = credential.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid Google credential. Please try again.');
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string; kid?: string };
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
        iss?: string; aud?: string | string[]; exp?: number; iat?: number; sub?: string;
        email?: string; email_verified?: boolean | string; name?: string;
      };
      if (header.alg !== 'RS256' || !header.kid) throw new Error('Invalid signing header');
      const key = await this.getGoogleSigningKey(header.kid);
      const validSignature = verifySignature(
        'RSA-SHA256',
        Buffer.from(`${parts[0]}.${parts[1]}`),
        key,
        Buffer.from(parts[2], 'base64url'),
      );
      const audienceValid = Array.isArray(claims.aud) ? claims.aud.includes(clientId) : claims.aud === clientId;
      const issuerValid = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
      const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
      if (!validSignature || !audienceValid || !issuerValid || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000) || !claims.sub || !claims.email || !emailVerified) {
        throw new Error('Invalid Google ID token claims');
      }
      return { email: claims.email.trim().toLowerCase(), name: claims.name?.trim() || claims.email.split('@')[0], subject: claims.sub };
    } catch {
      throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
    }
  }

  async loginWithGoogle(credential: string) {
    const identity = await this.verifyGoogleIdToken(credential);
    let user = await this.prisma.user.findUnique({ where: { email: identity.email } });
    if (user) {
      // Google only reaches this branch after signature, audience, expiry and verified-email checks.
      if (!user.emailVerifiedAt) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      }
    } else {
      const generatedPassword = await bcrypt.hash(randomBytes(48).toString('hex'), 12);
      try {
        user = await this.prisma.user.create({
          data: {
            name: identity.name.slice(0, 100),
            email: identity.email,
            therynoxId: this.createTherynoxId(),
            password: generatedPassword,
            emailVerifiedAt: new Date(),
          },
        });
      } catch {
        // A parallel Google sign-in or registration may have created the same email.
        user = await this.prisma.user.findUnique({ where: { email: identity.email } });
        if (!user) throw new ConflictException('Could not create your Therynox account. Please try again.');
      }
    }
    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      message: 'Google sign-in successful', accessToken, tokenType: 'Bearer', expiresIn: '1d',
      user: { id: user.id, therynoxId: user.therynoxId, name: user.name, email: user.email, role: user.role, sellerStatus: user.sellerStatus },
    };
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();

    const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) throw new ConflictException('Email is already registered');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    // Retry only identifier collisions. Email uniqueness conflicts are returned to the user.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const user = await this.prisma.user.create({
          data: { name, email, therynoxId: this.createTherynoxId(), password: hashedPassword },
          select: { id: true, name: true, email: true, therynoxId: true, role: true, sellerStatus: true, createdAt: true },
        });
        return { message: 'Registration successful', user };
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === 'P2002') {
          const emailAlreadyUsed = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
          if (emailAlreadyUsed) throw new ConflictException('Email is already registered');
          if (attempt < 2) continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Could not allocate a Therynox ID. Please try again.');
  }

  async login(data: { email?: string; identifier?: string; password: string }) {
    const identifier = (data.identifier ?? data.email ?? '').trim();
    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      data.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login successful',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '1d',
      user: {
        id: user.id,
        therynoxId: user.therynoxId,
        name: user.name,
        email: user.email,
        role: user.role,
        sellerStatus: user.sellerStatus,
      },
    };
  }

  private otpDigest(email: string, code: string) {
    const secret = this.config.get<string>('OTP_HASH_SECRET') || this.config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new BadRequestException('Authentication service is not configured securely. Set OTP_HASH_SECRET to a random secret of at least 32 characters.');
    }
    return createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
  }

  private safeEqualHex(a: string, b: string) {
    // Fixed-length digest comparison without exposing the OTP in API responses.
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return mismatch === 0;
  }

  private async sendLoginCode(email: string, code: string) {
    const from = this.config.get<string>('AUTH_EMAIL_FROM');
    const subject = 'Your Therynox sign-in code';
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#181818"><div style="font-size:13px;font-weight:700;letter-spacing:2px;color:#777">THERYNOX ACCOUNT SECURITY</div><h1>Sign in to Therynox</h1><p>Use this one-time code to securely sign in to your account:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px 0">${code}</div><p>This code expires in 10 minutes and can only be used once. If you did not request it, you can ignore this email.</p><hr style="border:0;border-top:1px solid #eee"><p style="font-size:12px;color:#777">Therynox Commerce OS · Automated security email</p></div>`;

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey && from) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email], subject, html }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      if (!response?.ok) {
        throw new BadRequestException('Could not send the sign-in email through Resend. Check your API key, sender, and recipient restrictions.');
      }
      return;
    }

    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');
    if (smtpHost && smtpUser && smtpPass) {
      const smtpPort = Number(this.config.get<string>('SMTP_PORT') || '587');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      await transporter.sendMail({
        from: from || `Therynox <${smtpUser}>`,
        to: email,
        subject,
        html,
        text: `Your Therynox sign-in code is ${code}. It expires in 10 minutes and can only be used once.`,
      }).catch(() => {
        throw new BadRequestException('Could not send the sign-in email through SMTP. Check your host, port, Gmail App Password, and sender address.');
      });
      return;
    }

    throw new BadRequestException('Email OTP is not configured. Set Resend credentials or SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env.');
  }

  async requestLoginOtp(rawIdentifier: string) {
    const generic = 'If this Therynox account exists, a sign-in code will be sent to its registered email address.';
    const user = await this.findUserByIdentifier(rawIdentifier);
    if (!user) return { message: generic };
    const email = user.email;

    const latest = await this.prisma.authOtpChallenge.findFirst({
      where: { email, purpose: 'LOGIN', createdAt: { gt: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: 'desc' }, select: { id: true },
    });
    if (latest) throw new BadRequestException('Please wait 60 seconds before requesting another code.');

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.authOtpChallenge.create({
      data: { email, codeHash: this.otpDigest(email, code), purpose: 'LOGIN', expiresAt: new Date(Date.now() + 10 * 60_000) },
    });
    try {
      await this.sendLoginCode(email, code);
    } catch (error) {
      // Invalidate the unsent challenge so a code cannot be guessed or reused.
      await this.prisma.authOtpChallenge.updateMany({ where: { email, purpose: 'LOGIN', consumedAt: null }, data: { consumedAt: new Date() } });
      throw error;
    }
    return { message: generic };
  }

  async verifyLoginOtp(rawIdentifier: string, rawCode: string) {
    const userForIdentifier = await this.findUserByIdentifier(rawIdentifier);
    if (!userForIdentifier) throw new UnauthorizedException('The code is invalid or expired. Request a new code.');
    const email = userForIdentifier.email;
    const challenge = await this.prisma.authOtpChallenge.findFirst({
      where: { email, purpose: 'LOGIN', consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge || challenge.attempts >= 5) throw new UnauthorizedException('The code is invalid or expired. Request a new code.');
    const expected = this.otpDigest(email, rawCode);
    if (!this.safeEqualHex(challenge.codeHash, expected)) {
      await this.prisma.authOtpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('The code is invalid or expired. Request a new code.');
    }
    const consumed = await this.prisma.authOtpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new UnauthorizedException('The code is invalid or expired. Request a new code.');
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('The code is invalid or expired. Request a new code.');
    if (!user.emailVerifiedAt) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      message: 'Login successful', accessToken, tokenType: 'Bearer', expiresIn: '1d',
      user: { id: user.id, therynoxId: user.therynoxId, name: user.name, email: user.email, role: user.role, sellerStatus: user.sellerStatus },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        therynoxId: true,
        name: true,
        email: true,
        role: true,
        sellerStatus: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Please sign in again.');
    }

    return { message: 'Authenticated user', user };
  }

  async applyForSeller(userId: string, data: {
    businessName: string; legalName: string;
    businessType: 'INDIVIDUAL' | 'SOLE_PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'OTHER';
    phone?: string; website?: string; addressLine1: string; city: string; state: string;
    postalCode: string; gstin?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.role === 'ADMIN') throw new BadRequestException('Admin accounts cannot apply for seller status');
    if (user.sellerStatus === 'PENDING') throw new ConflictException('Your seller application is already pending');
    if (user.sellerStatus === 'APPROVED') throw new ConflictException('Your seller application is already approved');

    const profileData = {
      businessName: data.businessName.trim(),
      legalName: data.legalName.trim(),
      businessType: data.businessType,
      phone: data.phone?.trim() || null,
      website: data.website?.trim() || null,
      addressLine1: data.addressLine1.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      postalCode: data.postalCode.trim(),
      country: 'India',
      gstin: data.gstin?.trim().toUpperCase() || null,
      kycStatus: 'PENDING' as const,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewNote: null,
    };

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.sellerProfile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      });
      return tx.user.update({
        where: { id: userId },
        data: { sellerStatus: 'PENDING' },
        select: { id: true, name: true, email: true, role: true, sellerStatus: true },
      });
    });

    return { message: 'Seller application submitted successfully', user: updatedUser };
  }

  async listPendingSellerApplications() {
    const applications = await this.prisma.user.findMany({
      where: { sellerStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        sellerStatus: true,
        createdAt: true,
        updatedAt: true,
        sellerProfile: true,
      },
    });

    return { count: applications.length, applications };
  }

  async reviewSellerApplication(userId: string, decision: 'APPROVED' | 'REJECTED') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.sellerStatus !== 'PENDING') {
      throw new BadRequestException('Only pending seller applications can be reviewed');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.sellerProfile.updateMany({
        where: { userId },
        data: {
          kycStatus: decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED',
          reviewedAt: new Date(),
        },
      });
      return tx.user.update({
        where: { id: userId },
        data: decision === 'APPROVED'
          ? { sellerStatus: 'APPROVED', role: 'SELLER' }
          : { sellerStatus: 'REJECTED' },
        select: { id: true, name: true, email: true, role: true, sellerStatus: true, updatedAt: true },
      });
    });

    return {
      message: decision === 'APPROVED'
        ? 'Seller application approved successfully'
        : 'Seller application rejected successfully',
      user: updatedUser,
    };
  }

}
