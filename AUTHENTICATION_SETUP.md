# Therynox authentication setup (local development)

This project keeps its NestJS API, Prisma/PostgreSQL database, and Next.js storefront. Authentication options are: email/password, email OTP through Resend, and Google sign-in. Google sign-in creates a normal Therynox CUSTOMER account on first sign-in and preserves an existing account's role when its verified email matches.

## 1. Configure the API

Copy `apps/api/.env.example` to `apps/api/.env` and set at least:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/therynox_dev?schema=public
JWT_SECRET=<random secret with at least 32 characters>
OTP_HASH_SECRET=<different random secret with at least 32 characters>
# Option A: Gmail SMTP for local development (recommended if you have no domain)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=<your 16-character Google App Password>
AUTH_EMAIL_FROM="Therynox <yourgmail@gmail.com>"

# Option B instead: Resend (leave SMTP values blank if using Resend)
RESEND_API_KEY=re_your_real_resend_key

GOOGLE_CLIENT_ID=<your Google OAuth Web client ID>
```

Generate secrets in PowerShell by running this twice and using different outputs:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For Gmail SMTP, enable 2-Step Verification on the Google account and create an App Password in Google Account security settings. Use that App Password (not your normal Gmail password). The sender should match `SMTP_USER`. A live website/domain is not needed for localhost testing. Alternatively, configure Resend; its testing sender may restrict recipients until a domain is verified. Never commit `.env` files.

## 2. Configure Google sign-in

1. Open https://console.cloud.google.com/ and select/create a Google Cloud project.
2. Configure the OAuth consent screen for your development app.
3. Create an OAuth Client ID of type **Web application**.
4. Add `http://localhost:3000` to **Authorized JavaScript origins**.
5. Copy the Client ID (not a client secret) into `GOOGLE_CLIENT_ID` in `apps/api/.env` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `apps/storefront/.env.local`. The value must match exactly.
6. The client secret is not needed for this Google Identity Services ID-token flow. Never put a Google client secret in a `NEXT_PUBLIC_` variable.

Create `apps/storefront/.env.local` from `.env.example`, then set:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same Google Web client ID>
```

## 3. Apply database migration and run

From the repository root in PowerShell:

```powershell
pnpm install
# Regenerate the Prisma client from the updated schema BEFORE typechecking/building
pnpm --filter @therynox/api exec prisma generate
# Apply database migrations after DATABASE_URL points to your development database
pnpm --filter @therynox/api exec prisma migrate deploy
pnpm --filter @therynox/api typecheck
pnpm --filter @therynox/api build
pnpm --filter @therynox/storefront typecheck
pnpm dev
```

The API is expected at `http://localhost:5000` and the storefront at `http://localhost:3000` (or the port Next.js prints). If a storefront process is already running, stop that terminal with Ctrl+C before starting another.

## 4. Authentication routes

- `POST /api/v1/auth/register` — email/password account creation.
- `POST /api/v1/auth/login` — email/password sign-in.
- `POST /api/v1/auth/otp/request` — request a one-time email code for an existing account.
- `POST /api/v1/auth/otp/verify` — verify a code and sign in; successful OTP verification marks the email verified.
- `POST /api/v1/auth/google` — validate a Google ID token on the API and sign in/create the account.

## Notes

- Google credentials are verified on the backend against Google's published signing keys, issuer, expiry, audience, and verified-email claim.
- Google account creation does not elevate privileges: new users receive the Prisma default `CUSTOMER` role. Existing account roles are retained.
- OTP email delivery supports Gmail/SMTP via Nodemailer or Resend. OTP values are never returned by the API. Real delivery requires valid provider credentials.
- This implementation does not yet add SMS OTP, passkeys, refresh-token rotation, or password-reset endpoints.


## Therynox-native account IDs

New accounts receive a unique public ID in the format `THY-XXXXXXXX`. Users can sign in with either their email address or this Therynox ID using their password, or request a passwordless email OTP. OTPs are sent to the email registered to the account even when the user enters their Therynox ID. Google sign-in remains an optional alternative.

Before typechecking or building after this update, regenerate Prisma Client from the authoritative schema, then apply migrations to your development database:

```powershell
pnpm --filter @therynox/api exec prisma generate
pnpm --filter @therynox/api exec prisma migrate deploy
pnpm --filter @therynox/api typecheck
pnpm --filter @therynox/api build
```

If `therynoxId`, `emailVerifiedAt`, or `authOtpChallenge` still appears missing from TypeScript types, Prisma Client was not regenerated from `apps/api/prisma/schema.prisma` or the generated output is being resolved from a different location. Do not patch generated types by hand; regenerate them from the schema.

The migration assigns IDs to existing users without changing their roles or passwords. Keep `apps/api/prisma/schema.prisma` as the authoritative Prisma schema.
