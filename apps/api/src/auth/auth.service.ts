
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: {
    name: string;
    email: string;
    password: string;
  }) {
    const email = data.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        sellerStatus: true,
        createdAt: true,
      },
    });

    return {
      message: 'Registration successful',
      user,
    };
  }

  async login(data: { email: string; password: string }) {
    const email = data.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

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
        name: user.name,
        email: user.email,
        role: user.role,
        sellerStatus: user.sellerStatus,
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
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
