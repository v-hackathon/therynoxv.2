import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles, UserRole } from './roles.decorator';
import { AuthService } from './auth.service';

@ApiTags('Admin - Sellers')
@ApiBearerAuth()
@Controller('admin/sellers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSellersController {
  constructor(private readonly authService: AuthService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending seller applications (admin only)' })
  listPending() {
    return this.authService.listPendingSellerApplications();
  }

  @Post(':userId/approve')
  @ApiOperation({ summary: 'Approve a seller application (admin only)' })
  approve(@Param('userId') userId: string) {
    return this.authService.reviewSellerApplication(userId, 'APPROVED');
  }

  @Post(':userId/reject')
  @ApiOperation({ summary: 'Reject a seller application (admin only)' })
  reject(@Param('userId') userId: string) {
    return this.authService.reviewSellerApplication(userId, 'REJECTED');
  }
}
