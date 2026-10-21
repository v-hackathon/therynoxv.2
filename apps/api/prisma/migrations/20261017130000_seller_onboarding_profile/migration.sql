CREATE TYPE "SellerBusinessType" AS ENUM ('INDIVIDUAL', 'SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'OTHER');
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "SellerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "businessType" "SellerBusinessType" NOT NULL,
  "phone" TEXT,
  "website" TEXT,
  "addressLine1" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'India',
  "gstin" TEXT,
  "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");
CREATE UNIQUE INDEX "SellerProfile_gstin_key" ON "SellerProfile"("gstin");
CREATE INDEX "SellerProfile_kycStatus_submittedAt_idx" ON "SellerProfile"("kycStatus", "submittedAt");
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
