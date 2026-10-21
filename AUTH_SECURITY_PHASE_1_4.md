# Authentication Security — Phase 1.4

This phase adds cryptographic JWT lifecycle tests to the existing API security test suite.

## Added tests
- A JWT signed with the configured test secret verifies and exposes expected non-sensitive claims.
- A token signed with a different secret is rejected.
- Expired JWTs are rejected.
- Malformed JWTs are rejected.

These tests use in-memory test secrets and do not connect to PostgreSQL or modify database data. They test JWT signing/verification behavior; they do not replace full HTTP end-to-end tests of the running NestJS server.

## Run on Windows
From the repository root:

```powershell
pnpm install
pnpm --filter @therynox/api exec prisma generate
pnpm --filter @therynox/api test:security
```

The `test:security` script builds the API first and then runs `node --test test/security.test.cjs`. If a test fails, share the complete output before changing the database or resetting migrations.
