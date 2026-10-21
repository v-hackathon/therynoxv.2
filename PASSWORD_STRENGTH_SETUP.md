# Registration password strength

Registration now checks these rules in the UI and on the API: at least 8 characters, uppercase letter, lowercase letter, digit, and special character. Passwords longer than 72 UTF-8 bytes are rejected to avoid bcrypt truncation behavior. A confirmation field and show-password toggle are included.

The API already hashes passwords using bcrypt with 12 rounds before writing them to PostgreSQL. Existing stored bcrypt hashes are not changed by this update.

After extracting the ZIP, keep your own `apps/api/.env` and `apps/storefront/.env.local` files private. Run `pnpm install`, then `pnpm --filter @therynox/api typecheck` and `pnpm --filter @therynox/storefront typecheck`; start API and storefront as usual.
