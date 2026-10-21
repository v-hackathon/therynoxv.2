# Therynox Commerce OS — Phase 4: Authentication UX refresh

## Scope
- Refreshes login and registration pages to a premium accessible light theme with responsive layouts.
- Login includes email normalization, submit locking, loading state, password visibility toggle, Caps Lock hint, accessible error messages, API timeout handling, and role-aware redirects.
- Access token remains in `sessionStorage` to keep it tab-scoped; it is not stored in `localStorage`.
- Registration keeps the existing API contract and password strength / confirmation checks while using the updated light-theme design.
- No Prisma schema or database migration is included in this phase.

## Local verification
From the repository root:

```powershell
pnpm install
pnpm --filter @therynox/api typecheck
pnpm --filter @therynox/storefront typecheck
pnpm --filter @therynox/storefront build
pnpm --filter @therynox/api test:integration
```

## Acceptance checklist
- [ ] Valid customer login redirects to `/account`.
- [ ] Approved seller login redirects to `/seller/products`.
- [ ] Admin login redirects to `/admin/sellers`.
- [ ] Invalid credentials show an inline message without clearing the form.
- [ ] API unavailable / timeout shows a useful connection message.
- [ ] Password can be shown or hidden without changing its value.
- [ ] Keyboard-only navigation and visible focus work.
- [ ] Registration password rules and confirmation still work.
- [ ] Existing seller onboarding and admin review flows still pass regression tests.

## Security note
The current API returns a bearer access token to the browser. This phase preserves the established tab-scoped session storage approach to avoid breaking current APIs. For production hardening, consider moving authentication to a backend-for-frontend / same-site HttpOnly Secure cookie design with CSRF protection, refresh-token rotation, and rate limiting. Do not use this ZIP as evidence those additional controls are already implemented.
