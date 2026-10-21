-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sellerStatus" "SellerStatus" NOT NULL DEFAULT 'NOT_APPLIED';
