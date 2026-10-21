# Therynox Commerce OS — Security & Catalog Hardening (Phase 1.6)

## Changes included

- JWT requests now load the current account from PostgreSQL and use the database role/status, instead of authorizing with a potentially stale role embedded in the token.
- Deleted accounts are rejected during JWT validation.
- `JWT_SECRET` must be configured and be at least 32 characters. Set a strong random value in `apps/api/.env`; changing it invalidates existing access tokens, so users must sign in again.
- Seller catalog operations require a `SELLER` account whose seller application is `APPROVED` and whose seller profile KYC is `VERIFIED`.
- Product stock updates now run in a serializable transaction; serialization conflicts return HTTP 409 so the seller can refresh and retry rather than silently recording stale stock history.
- Product removal archives the product rather than deleting it, retaining inventory movement history for audit purposes. Approved products still cannot be removed by this endpoint.
- Archived products cannot be edited or submitted for review.
- Product moderation uses a conditional update so only products still in `IN_REVIEW` can receive a decision.
- Seller approval checks that a seller profile exists and conditionally claims a pending application, preventing duplicate concurrent decisions. Rejected applications return to the CUSTOMER role and can be resubmitted through the existing application flow.
- Category parent IDs are validated as UUIDs, and inactive categories cannot be selected as parents.
- Integration tests now cover customer denial for seller/admin routes and anonymous access to the public catalog.

## Local setup / rollout

1. Keep the existing database and migrations. No schema migration is required by this phase.
2. In `apps/api/.env`, set `JWT_SECRET` to a unique random secret of at least 32 characters. Never commit or share `.env` files.
3. Run `pnpm install` from the repository root.
4. Run `pnpm --filter @therynox/api exec prisma generate`.
5. Run `pnpm --filter @therynox/api typecheck`.
6. Run `pnpm --filter @therynox/api build`.
7. Start the API in one terminal, then run `pnpm --filter @therynox/api test:integration` in another.
8. Run `pnpm --filter @therynox/api test:security`.

## Verification note

This archive was prepared in an environment where the included `node_modules` links point to the original Windows machine and the package store is not available. The code changes have not been represented as build/test verified here. Run the commands above on the development machine before merging. The integration test creates a disposable test user and currently reports its email; it does not delete that database row.
