import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ProductInput = { name?: string; slug?: string; description?: string; price?: number; stock?: number; imageUrl?: string; sku?: string; categoryId?: string };
type CategoryInput = { name: string; slug: string; description?: string; parentId?: string };
type ReviewStatus = 'APPROVED' | 'REJECTED';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForSeller(sellerId: string) {
    const products = await this.prisma.product.findMany({ where: { sellerId }, include: { category: true }, orderBy: { createdAt: 'desc' } });
    return { count: products.length, products };
  }

  async create(sellerId: string, input: ProductInput) {
    const slug = input.slug!.trim().toLowerCase();
    if (await this.prisma.product.findUnique({ where: { slug } })) throw new ConflictException('This product slug is already in use');
    const sku = input.sku?.trim().toUpperCase() || `THX-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 24)}-${Date.now().toString().slice(-6)}`;
    if (await this.prisma.product.findUnique({ where: { sku } })) throw new ConflictException('This SKU is already in use');
    if (input.categoryId && !(await this.prisma.category.findFirst({ where: { id: input.categoryId, isActive: true } }))) throw new BadRequestException('Selected category is not active');
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: { sellerId, name: input.name!.trim(), slug, description: input.description!.trim(), price: input.price!, stock: input.stock!, imageUrl: input.imageUrl || null, sku, categoryId: input.categoryId || null } });
      if (input.stock! > 0) await tx.inventoryMovement.create({ data: { productId: created.id, sellerId, type: 'INITIAL_STOCK', delta: input.stock!, beforeStock: 0, afterStock: input.stock!, note: 'Initial stock on product creation' } });
      return created;
    });
    return { message: 'Product created as draft. Submit it for admin review before it appears in the public catalog.', product };
  }

  async update(sellerId: string, id: string, input: ProductInput) {
    const existing = await this.prisma.product.findFirst({ where: { id, sellerId } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.status === 'IN_REVIEW') throw new ConflictException('Product is under review; edits are temporarily locked');
    if (input.slug) {
      input.slug = input.slug.trim().toLowerCase();
      if (await this.prisma.product.findFirst({ where: { slug: input.slug, NOT: { id } } })) throw new ConflictException('This product slug is already in use');
    }
    if (input.sku) {
      input.sku = input.sku.trim().toUpperCase();
      if (await this.prisma.product.findFirst({ where: { sku: input.sku, NOT: { id } } })) throw new ConflictException('This SKU is already in use');
    }
    if (input.categoryId && !(await this.prisma.category.findFirst({ where: { id: input.categoryId, isActive: true } }))) throw new BadRequestException('Selected category is not active');
    const nextStock = input.stock ?? existing.stock;
    const delta = nextStock - existing.stock;
    const product = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: { ...(input.name !== undefined ? { name: input.name.trim() } : {}), ...(input.slug !== undefined ? { slug: input.slug } : {}), ...(input.description !== undefined ? { description: input.description.trim() } : {}), ...(input.price !== undefined ? { price: input.price } : {}), ...(input.stock !== undefined ? { stock: input.stock } : {}), ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}), ...(input.sku !== undefined ? { sku: input.sku } : {}), ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}), status: existing.status === 'APPROVED' ? 'DRAFT' : existing.status, rejectionReason: null } });
      if (delta !== 0) await tx.inventoryMovement.create({ data: { productId: id, sellerId, type: 'ADJUSTMENT', delta, beforeStock: existing.stock, afterStock: nextStock, note: 'Seller stock adjustment' } });
      return updated;
    });
    return { message: 'Product updated. If it was approved, changes require review before republishing.', product };
  }

  async submitForReview(sellerId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, sellerId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.name.trim().length < 2 || product.description.trim().length < 2 || product.price < 0 || !product.sku) throw new BadRequestException('Complete required product details before submitting');
    if (product.status === 'IN_REVIEW') throw new ConflictException('Product is already under review');
    return this.prisma.product.update({ where: { id }, data: { status: 'IN_REVIEW', submittedAt: new Date(), rejectionReason: null } });
  }

  async remove(sellerId: string, id: string) {
    const existing = await this.prisma.product.findFirst({ where: { id, sellerId } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.status === 'APPROVED') throw new ConflictException('Archive an approved product instead of deleting it');
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  async listCategories() {
    const categories = await this.prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    const byId = new Map(categories.map(c => [c.id, { ...c, children: [] as unknown[] }]));
    const roots: unknown[] = [];
    for (const category of categories) {
      const node = byId.get(category.id)!;
      if (category.parentId && byId.has(category.parentId)) (byId.get(category.parentId)!.children as unknown[]).push(node);
      else roots.push(node);
    }
    return { count: categories.length, categories: roots };
  }

  async createCategory(input: CategoryInput) {
    const slug = input.slug.trim().toLowerCase();
    if (await this.prisma.category.findUnique({ where: { slug } })) throw new ConflictException('Category slug already exists');
    if (input.parentId && !(await this.prisma.category.findUnique({ where: { id: input.parentId } }))) throw new NotFoundException('Parent category not found');
    return this.prisma.category.create({ data: { name: input.name.trim(), slug, description: input.description?.trim(), parentId: input.parentId || null } });
  }

  async listApprovedProducts() {
    const products = await this.prisma.product.findMany({ where: { status: 'APPROVED', OR: [{ categoryId: null }, { category: { isActive: true } }] }, include: { category: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { count: products.length, products };
  }

  async reviewQueue() {
    const products = await this.prisma.product.findMany({ where: { status: 'IN_REVIEW' }, include: { category: true, seller: { select: { id: true, name: true, email: true } } }, orderBy: { submittedAt: 'asc' } });
    return { count: products.length, products };
  }

  async reviewProduct(id: string, status: ReviewStatus, reason?: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.status !== 'IN_REVIEW') throw new ConflictException('Only products in review can receive a decision');
    if (status === 'REJECTED' && !reason?.trim()) throw new BadRequestException('A rejection reason is required');
    return this.prisma.product.update({ where: { id }, data: { status, reviewedAt: new Date(), rejectionReason: status === 'REJECTED' ? reason!.trim() : null } });
  }

  async inventoryHistory(sellerId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, sellerId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.inventoryMovement.findMany({ where: { productId, sellerId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}
