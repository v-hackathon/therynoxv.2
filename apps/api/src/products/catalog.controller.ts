import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole } from '../auth/roles.decorator';
import { ProductsService } from './products.service';

class CreateCategoryDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() @MinLength(2) @MaxLength(120) slug!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() parentId?: string;
}

@ApiTags('Catalog - Categories')
@Controller()
export class CatalogController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List active categories as a parent/child tree' })
  listCategories() { return this.productsService.listCategories(); }

  @Get('catalog/products')
  @ApiOperation({ summary: 'List approved products for public storefront discovery' })
  listPublicProducts() { return this.productsService.listApprovedProducts(); }

  @Post('admin/categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a category (admin only)' })
  createCategory(@Body() body: CreateCategoryDto) { return this.productsService.createCategory(body); }
}
