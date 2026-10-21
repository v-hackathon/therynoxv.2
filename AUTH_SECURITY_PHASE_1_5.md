# Therynox Commerce OS — Phase 1.5: HTTP Integration Tests

This phase adds opt-in HTTP integration tests for the running NestJS API. It checks real HTTP status codes and response bodies for health, registration validation, registration, duplicate email, login, `/auth/me`, malformed/missing JWTs, and CUSTOMER denial on the temporary admin-only RBAC test route.

## Before running

- Start PostgreSQL and ensure `apps/api/.env` has a working `DATABASE_URL` and `JWT_SECRET`.
- Apply already-created migrations if needed; do not run `migrate reset`.
- Start the API in a separate terminal with `pnpm --filter @therynox/api dev`.
- Use a development/test database only. The test creates a uniquely named user and deliberately does not delete database rows.

## Run

From the repository root:

```powershell
pnpm --filter @therynox/api test:integration
```

By default, tests target `http://localhost:5000/api/v1`. To target another local test server:

```powershell
$env:TEST_API_URL = "http://localhost:5000/api/v1"
pnpm --filter @therynox/api test:integration
```

The script builds the API, then runs Node's built-in test runner. It uses no extra test dependency. The HTTP test requires a reachable API and database and will create one disposable user record. It does not reset or migrate the database.

## Scope and limitations

- This is integration testing against a running API, not a proof of production readiness.
- Token expiry and cryptographic signature behavior are covered separately by unit tests in `test/security.test.cjs`.
- The current admin RBAC route is a temporary test route (`GET /api/v1/rbac-test/admin`).
- Logout currently removes the browser-side session token; server-side JWT revocation is not implemented by this phase.
- Run only against a development/test database, never production.
