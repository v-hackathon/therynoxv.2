# Therynox role dashboards — Phase 1

## Included
- Adds `SUPPLIER`, `ADMIN_STAFF`, `MANAGER`, `CEO`, `MAIN_ADMIN`, and `SUPER_ADMIN` to the existing role enum while preserving `CUSTOMER`, `SELLER`, and `ADMIN`.
- Login redirects users by their role.
- Adds guarded dashboard entry pages for Super Admin, Main Admin, CEO, Manager, Admin Staff, and Supplier. The existing Seller and Customer routes are preserved.
- Adds a PostgreSQL enum migration that adds values only; it does not reset or delete user data.

## Important security notes
- Dashboard session checks are a user-interface convenience, not the security boundary. Protected API routes must enforce permissions with JWT and role guards.
- Public registration continues to create customers only. Do not allow a registration form to self-select privileged roles. New privileged accounts must be assigned by a trusted, auditable provisioning workflow.
- This phase establishes the dashboard routing and role model; many dashboard cards are placeholders for future feature modules. It does not claim that analytics, team management, supplier purchasing, or privileged-role provisioning are already implemented.

## Apply database migration
Back up the database first. Apply the included migration through your normal Prisma migration process. Do not run `prisma db push --force-reset` and do not reset the database. Generate the Prisma client after schema changes, then run typecheck/build/tests.
