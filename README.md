# Therynox Commerce OS

Clean monorepo foundation for the Therynox multi-vendor marketplace.

## Stack

- pnpm workspaces + Turborepo
- `apps/storefront`: Next.js App Router + TypeScript
- `apps/api`: NestJS REST API + configuration validation
- PostgreSQL + Prisma: intentionally not connected yet; database setup and the canonical schema are the next phase

## Requirements

- Node.js 22.12+
- pnpm 10+
- PostgreSQL is **not required** to run the starter health endpoint or storefront. It will be needed when database integration begins.

## Start on Windows PowerShell

```powershell
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
pnpm dev
```

- Storefront: http://localhost:3000
- API health: http://localhost:5000/api/v1/health
- API Swagger: http://localhost:5000/api/docs

If PowerShell blocks scripts, use an elevated terminal only if needed and follow your organization/device policy. Do not disable security protections globally.

## Available commands

```powershell
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
```

## Safety notes

- Never commit `.env` files or real credentials.
- No payment provider or live database is configured.
- No production migrations or external service calls are included.
- The health endpoint reports application status only; it does not claim that a database is connected.

## Initial structure

```text
apps/
  api/          NestJS REST API
  storefront/   Next.js storefront shell (design is intentionally minimal)
packages/
  typescript-config/
```

Additional apps for seller, supplier, and admin portals can be added after the core contracts and authorization foundation are validated.

## Admin seller management UI

The seller review console is available at `/admin/sellers` in the storefront app. Start the API and storefront, sign in through your existing API flow with an Admin account, then paste that Admin access token into the console to load pending seller applications. The token is stored only in the current browser session (`sessionStorage`) and is not written to the project files.

Configure the storefront API URL with `apps/storefront/.env.local` using `apps/storefront/.env.example` as a template. Default local API URL: `http://localhost:5000/api/v1`.

Only an account with the `ADMIN` role can access the seller review endpoints. The UI does not create an Admin account or bypass API authorization.


## Authentication security Phase 1.4
See `AUTH_SECURITY_PHASE_1_4.md` for JWT signature, expiry, and malformed-token tests.

## Authentication security tests

- Unit/security tests: `pnpm --filter @therynox/api test:security`
- HTTP integration tests against a running development API: see `AUTH_SECURITY_PHASE_1_5.md` and run `pnpm --filter @therynox/api test:integration`.

The HTTP integration suite creates a unique test user in the configured database and does not delete it or reset the database. Use a development/test database only.


## Phase 2 seller onboarding
See `SELLER_ONBOARDING_PHASE_2.md` for migration and setup steps.


## Email OTP sign-in
See `AUTH_EMAIL_OTP_PHASE_1_8.md` for setup, migration, and security notes. Email OTP requires a configured Resend sender and API key.


## Authentication setup

For local email OTP and Google sign-in configuration, see [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md).
