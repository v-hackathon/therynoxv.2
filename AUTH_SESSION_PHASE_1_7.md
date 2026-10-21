# Authentication Session Unification — Phase 1.7

## Changes
- Added `apps/storefront/lib/auth-session.ts` as the single browser-tab session utility.
- Login and registration now write the access token and user through the same helper.
- Legacy role-specific session keys (`therynox_admin_token`, `therynox_seller_token`) are migrated to the canonical `therynox_access_token` key and cleared.
- Account sign-out clears the canonical and legacy session keys.
- Seller product, seller catalog, admin seller review, and admin product review pages now read the signed-in session automatically instead of asking the user to paste a JWT.
- Protected seller/admin pages verify the current user with `/auth/me` before loading privileged data and redirect users who do not have the required role/status.
- Existing API endpoints and database schema/migrations were not changed by this phase.

## Verification
- TypeScript/TSX parser syntax checks passed for the nine modified/new storefront files.
- Full Next.js typecheck/build and API integration tests were not run in this packaging environment because the ZIP does not include installable dependency contents and `pnpm` is unavailable here. Run the commands below on the development machine after `pnpm install`.

```powershell
pnpm install
pnpm --filter @therynox/storefront typecheck
pnpm --filter @therynox/storefront build
pnpm --filter @therynox/api typecheck
pnpm --filter @therynox/api test:security
pnpm --filter @therynox/api test:integration
```

## Environment safety
Real `.env` and `.env.local` files are intentionally excluded from this archive. Copy the `.env.example` files to local environment files and provide your own credentials locally. Never commit or share real database credentials or JWT secrets.
