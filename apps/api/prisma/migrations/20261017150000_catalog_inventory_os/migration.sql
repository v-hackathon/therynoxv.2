-- Additive, non-destructive catalog and inventory foundation.
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "InventoryMovementType" AS ENUM ('INITIAL_STOCK', 'ADJUSTMENT');

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "parentId" TEXT,
  "createdById" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_isActive_idx" ON "Category"("parentId", "isActive");
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN "sku" TEXT;
ALTER TABLE "Product" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Product" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Product" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "delta" INTEGER NOT NULL,
  "beforeStock" INTEGER NOT NULL,
  "afterStock" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");
CREATE INDEX "InventoryMovement_sellerId_createdAt_idx" ON "InventoryMovement"("sellerId", "createdAt");
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
