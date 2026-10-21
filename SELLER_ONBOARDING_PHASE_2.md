# Phase 2 — Seller onboarding and business profile

## Added
- `SellerProfile` one-to-one model with business details, address, optional GSTIN, KYC status and admin review metadata.
- `POST /api/v1/auth/seller/apply` now requires business application fields and validates them server-side.
- Application/profile writes and admin review status updates use Prisma transactions.
- Admin pending applications include seller profile details.
- `/seller/apply` storefront form; account page links to the form instead of submitting an empty application.
- New migration: `20261017130000_seller_onboarding_profile`.

## Apply safely
1. Back up the development database.
2. Confirm `apps/api/.env` has the existing correct `DATABASE_URL` and `JWT_SECRET`; do not replace secrets.
3. From repository root run:
   ```powershell
   pnpm install
   pnpm --filter @therynox/api exec prisma validate
   pnpm --filter @therynox/api exec prisma migrate deploy
   pnpm --filter @therynox/api exec prisma generate
   pnpm --filter @therynox/api typecheck
   pnpm --filter @therynox/storefront typecheck
   ```
4. Start API and storefront in separate terminals.
5. Sign in as a CUSTOMER and open `/account`, then choose Apply to sell.
6. Sign in as ADMIN and open `/admin/sellers` to review the application.

## Notes
- The migration adds a new table and enums; it does not reset or delete existing users/products.
- KYC here is a workflow status and business profile, not identity verification. No identity documents or PAN/Aadhaar are collected in this phase. Verify legal/compliance requirements before production.
- This package was prepared from the previous project archive; run the commands above locally before treating it as build-verified.
