import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole } from '../auth/roles.decorator';
import { ProductsService } from './products.service';

class RejectionDto {
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

@ApiTags('Admin - Product moderation')
@ApiBearerAuth()
@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ProductReviewController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('review-queue')
  @ApiOperation({ summary: 'List products submitted for review (admin only)' })
  queue() { return this.productsService.reviewQueue(); }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a product for public catalog visibility' })
  approve(@Param('id', ParseUUIDPipe) id: string) { return this.productsService.reviewProduct(id, 'APPROVED'); }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a product with a reason' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() body: RejectionDto) { return this.productsService.reviewProduct(id, 'REJECTED', body.reason); }
}
