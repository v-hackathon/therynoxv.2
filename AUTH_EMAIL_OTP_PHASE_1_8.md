# Therynox Email OTP Sign-in — Phase 1.8

## Included
- Existing email/password login remains available.
- New `POST /api/v1/auth/otp/request` and `POST /api/v1/auth/otp/verify` endpoints.
- Six-digit OTPs are HMAC-hashed before storage, expire after 10 minutes, allow at most five verification attempts, are consumed once, and have a 60-second resend cooldown.
- Email delivery uses the Resend HTTP API via Node's built-in `fetch`; no new package dependency is required.
- The login page includes password and email-OTP modes and keeps existing role-aware redirects.
- Generic request responses reduce account enumeration. OTPs are never returned in API responses or logs.

## Setup (PowerShell)
1. Copy `apps/api/.env.example` to `apps/api/.env` if you have not already.
2. Set `DATABASE_URL`, a random `JWT_SECRET` of at least 32 characters, a different random `OTP_HASH_SECRET` of at least 32 characters, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM` using a sender verified with Resend.
3. From the repo root run `pnpm install`.
4. Run the migration: `pnpm --filter @therynox/api exec prisma migrate deploy`.
5. Regenerate Prisma client if needed: `pnpm --filter @therynox/api exec prisma generate`.
6. Run `pnpm --filter @therynox/api typecheck`, `pnpm --filter @therynox/storefront typecheck`, `pnpm --filter @therynox/api build`, and `pnpm --filter @therynox/storefront build`.

## Important limits
- This phase adds email OTP sign-in, not SMS OTP, social login, password reset, passkeys, or a complete device/session manager.
- Configure API-level rate limiting at the reverse proxy or add a dedicated throttling guard before public production launch. The persisted resend cooldown and attempt cap are helpful controls but do not replace network-level rate limiting.
- OTP delivery requires working Resend credentials. The endpoint intentionally does not fall back to returning codes in development.
- Existing password login and registration contracts remain intact. Email OTP sign-in currently proves control of the email address but does not automatically mark legacy accounts as email-verified.
