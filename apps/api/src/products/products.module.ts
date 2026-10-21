import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CatalogController } from './catalog.controller';
import { ProductReviewController } from './product-review.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProductsController, CatalogController, ProductReviewController],
  providers: [ProductsService, PrismaService],
})
export class ProductsModule {}
