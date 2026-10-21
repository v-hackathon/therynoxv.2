
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles, UserRole } from './roles.decorator';

@ApiTags('RBAC Test')
@ApiBearerAuth()
@Controller('rbac-test')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminTestController {
  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Temporary admin-only RBAC test endpoint' })
  adminOnly() {
    return { message: 'Admin access granted' };
  }
}
