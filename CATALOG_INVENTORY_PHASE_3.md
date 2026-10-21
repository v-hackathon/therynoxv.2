# Therynox Commerce OS — Phase 3 Catalog & Inventory Foundation

## Scope
- Additive Prisma migration for category hierarchy, product review lifecycle, SKU, and inventory movement history.
- Seller product drafts remain private until submitted and approved by an admin.
- Admin-only category creation and product review queue/approve/reject endpoints.
- Public endpoints only return approved products.
- Seller ownership is enforced on update, delete, submit-for-review, and inventory history routes.
- Stock changes are recorded in `InventoryMovement` inside the same database transaction as the product change.
- Light-theme Seller Catalog UI at `/seller/catalog`; the existing `/seller/products` route remains available for backwards compatibility.

## New API endpoints
- `GET /api/v1/categories` — active categories as a parent/child tree.
- `POST /api/v1/admin/categories` — admin only; `{ "name": "Clothing", "slug": "clothing", "parentId": "optional-category-uuid" }`.
- `GET /api/v1/catalog/products` — public approved catalog.
- `GET /api/v1/admin/products/review-queue` — admin only.
- `POST /api/v1/admin/products/:id/approve` — admin only.
- `POST /api/v1/admin/products/:id/reject` — admin only; body `{ "reason": "Explain what must change" }`.
- `POST /api/v1/seller/products/:id/submit-review` — authenticated seller who owns product.
- `GET /api/v1/seller/products/:id/inventory-history` — authenticated owner only.
- Existing `GET/POST/PATCH/DELETE /api/v1/seller/products` routes are retained.

## Migration safety
`20261017150000_catalog_inventory_os` only adds enums, tables, nullable columns, indexes, and foreign keys. It does not delete or rewrite existing user/seller/product records. Existing products receive `DRAFT` status by default and must be submitted and approved before appearing in public catalog.

## Apply locally (staging/local development first)
From project root:
```powershell
pnpm install
pnpm --filter @therynox/api exec prisma validate
pnpm --filter @therynox/api exec prisma migrate deploy
pnpm --filter @therynox/api exec prisma generate
pnpm --filter @therynox/api typecheck
pnpm --filter @therynox/storefront typecheck
pnpm --filter @therynox/api test:integration
```
Do not run against production before taking a verified backup and reviewing the migration. This phase's generated Prisma client is intentionally regenerated from the schema after install; do not hand-edit generated client files.

## Acceptance checklist
- [ ] Existing auth/security integration tests still pass.
- [ ] Existing seller onboarding and admin review still work.
- [ ] Category tree can be read publicly; only admins can create categories.
- [ ] Seller cannot read/update/delete/submit another seller's product.
- [ ] New product is `DRAFT` and is absent from public catalog.
- [ ] Submitted product appears in admin review queue but not public catalog.
- [ ] Admin approval makes it visible in public catalog.
- [ ] Admin rejection requires a reason and seller can resubmit after changes.
- [ ] Initial stock and every stock adjustment create an inventory movement record atomically.
- [ ] Migration is applied to a staging copy first; database backup/restore procedure is verified.

## Current limitations / next phase
This is a catalog/inventory foundation, not a claim of complete production readiness. Product variants, category-specific dynamic attributes, image upload provider, bulk import/export, search indexing, inventory reservation for checkout, audit-event infrastructure, and expanded e2e tests are planned follow-on work. Public product listing is currently capped at 100 newest approved products; cursor pagination/search/filtering should be added before large-scale launch.
