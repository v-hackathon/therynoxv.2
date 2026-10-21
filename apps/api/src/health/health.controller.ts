
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check whether the API process is responding' })
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'therynox-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  @ApiOperation({ summary: 'Check PostgreSQL database connectivity' })
  async getDatabaseHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
      });
    }
  }
}
