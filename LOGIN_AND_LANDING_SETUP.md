# Therynox Landing Page and Login Setup

## New storefront routes
- `/` — public marketplace landing page
- `/register` — create a customer account using `POST /api/v1/auth/register`
- `/login` — login using `POST /api/v1/auth/login`; the JWT is saved in `sessionStorage` and is not manually pasted
- `/account` — account overview, seller application button, and role-specific links
- `/seller/products` — existing seller product workspace
- `/admin/sellers` — existing admin seller review workspace

## Run locally
From the monorepo root:

```powershell
pnpm install
pnpm --filter @therynox/api dev
```

In a second terminal:

```powershell
pnpm --filter @therynox/storefront dev
```

Storefront defaults to `http://localhost:3000`; API defaults to `http://localhost:5000/api/v1`. To change the API URL, create `apps/storefront/.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

API `.env` must have valid `DATABASE_URL` and `JWT_SECRET` values. Never commit `.env` secrets.

## Authentication flow
Registration creates a normal CUSTOMER account. After registration the UI signs in automatically and opens `/account`. From there a customer can apply to become a seller; an admin must approve that application before seller product management works. Existing ADMIN users are redirected to `/admin/sellers`; approved SELLER users are redirected to `/seller/products`.

JWTs are stored in browser `sessionStorage` for the current tab/session to avoid manual token copy/paste. For a production deployment, prefer secure HttpOnly cookies and appropriate CSRF protections rather than long-lived tokens in browser storage.


## Auth and account dashboard fix
- The authenticated `/auth/me` endpoint now loads the full safe user profile from PostgreSQL, including `name` and `sellerStatus`; it never returns the password hash.
- The account page handles missing names safely and clears stale browser session data if the token is invalid.
- Login stores the JWT in sessionStorage and routes ADMIN to `/admin/sellers`, approved SELLER to `/seller/products`, and CUSTOMER/pending sellers to `/account`.
- Logout clears session token and cached user data and returns to the landing page.
