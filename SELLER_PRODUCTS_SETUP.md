# Seller Products Feature

This update adds a seller-owned product catalog.

## API routes
- `GET /api/v1/seller/products` — list the authenticated seller's products.
- `POST /api/v1/seller/products` — create a product.
- `PATCH /api/v1/seller/products/:id` — update one of the authenticated seller's products.
- `DELETE /api/v1/seller/products/:id` — delete one of the authenticated seller's products.

All routes require a valid JWT and the `SELLER` role. The approval flow assigns that role.

## Apply the database migration
From the repository root, run:

```powershell
pnpm --filter @therynox/api exec prisma validate
pnpm --filter @therynox/api exec prisma migrate deploy
pnpm --filter @therynox/api exec prisma generate
pnpm --filter @therynox/api typecheck
```

Use the existing `apps/api/.env` with your local `DATABASE_URL` and `JWT_SECRET`; do not overwrite it. If `apps/api/.env` does not exist, copy `apps/api/.env.example` and fill in your own credentials first.

Then restart the API:

```powershell
pnpm --filter @therynox/api dev
```

## Storefront
In a second terminal at the repository root:

```powershell
pnpm --filter @therynox/storefront dev
```

Open `http://localhost:3000/seller/products`.

Log in using an account whose role is `SELLER` and paste its access token. The admin account cannot manage seller products. Use a seller account that has been approved in the admin seller-review page.

## Notes
- Product slugs are unique across the marketplace.
- Product price is stored as a numeric value and stock as a non-negative integer.
- This is a foundation: image uploads, categories, product moderation, edit form, and order management are not included yet.
