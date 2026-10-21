import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post,
  Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole } from '../auth/roles.decorator';
import { ProductsService } from './products.service';

class CreateProductDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @MinLength(2) @MaxLength(160) slug!: string;
  @IsString() @MaxLength(5000) description!: string;
  @IsNumber() @Min(0) price!: number;
  @IsInt() @Min(0) @Max(10000000) stock!: number;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(2048) imageUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) sku?: string;
  @IsOptional() @IsUUID() categoryId?: string;
}

class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) slug?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) stock?: number;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(2048) imageUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) sku?: string;
  @IsOptional() @IsUUID() categoryId?: string;
}

interface SellerRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@ApiTags('Seller - Products')
@ApiBearerAuth()
@Controller('seller/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products belonging to the authenticated seller' })
  list(@Req() req: SellerRequest) {
    return this.productsService.listForSeller(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product for the authenticated seller' })
  create(@Req() req: SellerRequest, @Body() body: CreateProductDto) {
    return this.productsService.create(req.user.userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product belonging to the authenticated seller' })
  update(@Req() req: SellerRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateProductDto) {
    return this.productsService.update(req.user.userId, id, body);
  }

  @Post(':id/submit-review')
  @ApiOperation({ summary: 'Submit a draft/rejected product for admin review' })
  submitForReview(@Req() req: SellerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.submitForReview(req.user.userId, id);
  }

  @Get(':id/inventory-history')
  @ApiOperation({ summary: 'Read inventory movement history for an owned product' })
  inventoryHistory(@Req() req: SellerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.inventoryHistory(req.user.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product belonging to the authenticated seller' })
  remove(@Req() req: SellerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(req.user.userId, id);
  }
}
