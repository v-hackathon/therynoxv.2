# Phase 1.3 — JWT Payload & Role Authorization Tests

## Run

From the repository root in PowerShell:

```powershell
pnpm install
pnpm --filter @therynox/api exec prisma generate
pnpm --filter @therynox/api test:security
```

The command builds the NestJS API and runs Node's built-in test runner against compiled services. These unit tests use mocked Prisma calls and do not connect to or mutate PostgreSQL.

## Coverage

- Registration normalizes email/name, hashes passwords with bcrypt, and omits password/hash from responses.
- Duplicate email is rejected.
- Login returns a token for valid credentials and uses a generic error for unknown email/wrong password.
- Current-user logic omits password data and rejects a missing/deleted user.
- Admin accounts cannot apply for seller status.
- JWT payload validation rejects missing subject/email and unknown roles.
- JWT strategy returns only safe request identity fields.
- RolesGuard allows matching roles and denies mismatched/missing users when a role is required.

## Not covered yet

These are unit-level tests. They do not verify actual HTTP routing, bearer-token signature/expiry behavior through Passport, browser logout, CORS, rate limiting, or live database integration. Complete those before production deployment. The suite does not reset or modify the database.

The archive intentionally excludes `.env` and `.env.local`. Keep secrets in local environment files and never commit them.
