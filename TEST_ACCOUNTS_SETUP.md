# Development Test Accounts

This setup creates eight development-only accounts for role-dashboard testing. It is idempotent: it creates missing accounts only and skips existing emails without changing their roles, passwords, or records. It never deletes database rows.

## 1. Configure `apps/api/.env`

Keep your existing `DATABASE_URL` and other settings. Add these lines only to a local development `.env` file:

```env
NODE_ENV=development
ENABLE_TEST_ACCOUNTS=true
TEST_ACCOUNT_PASSWORD=Choose-A-Unique-Dev-Password-Here!
```

Use your own password (at least 12 characters). Do not commit `.env`, do not use these test accounts in production, and do not reuse a production password.

## 2. Create accounts

From the repository root:

```powershell
pnpm --filter @therynox/api seed:test-accounts
```

This builds the API and runs the seeder. The script refuses to run if `NODE_ENV=production`, if `ENABLE_TEST_ACCOUNTS` is not explicitly `true`, if `DATABASE_URL` is missing, or if the password is too short.

## 3. Test credentials

All newly created accounts use the exact value you set in `TEST_ACCOUNT_PASSWORD`:

| Role | Login email | Dashboard route |
|---|---|---|
| Super Admin | `superadmin@therynox.test` | `/super-admin` |
| Main Admin | `mainadmin@therynox.test` | `/main-admin` |
| CEO | `ceo@therynox.test` | `/ceo` |
| Manager | `manager@therynox.test` | `/manager` |
| Admin Staff | `staff@therynox.test` | `/staff` |
| Seller | `seller@therynox.test` | `/seller` |
| Supplier | `supplier@therynox.test` | `/supplier` |
| Customer | `customer@therynox.test` | `/account` |

The seeder hashes the password with bcrypt. Existing accounts are skipped and are not assigned a new role or password. If an email already exists with a different role, inspect it manually in a development database before testing; this script intentionally will not overwrite it.

## Safety

Run only against a local development/test database. Do not point this script at production. The script does not run migrations or reset the database.
