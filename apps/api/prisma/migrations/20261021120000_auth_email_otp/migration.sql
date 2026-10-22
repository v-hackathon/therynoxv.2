ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

CREATE TYPE "AuthOtpPurpose" AS ENUM ('LOGIN', 'EMAIL_VERIFICATION', 'PASSWORD_RESET');

CREATE TABLE "AuthOtpChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "AuthOtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthOtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuthOtpChallenge_email_purpose_createdAt_idx" ON "AuthOtpChallenge"("email", "purpose", "createdAt");
CREATE INDEX "AuthOtpChallenge_expiresAt_idx" ON "AuthOtpChallenge"("expiresAt");
