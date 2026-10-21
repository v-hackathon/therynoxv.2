# Phase 3 Release Notes

- Existing authentication, seller onboarding, and admin seller-review code has been left in place.
- New migration is additive and has not been applied to any database by this artifact.
- New API and UI source are included; local typecheck/build and database integration checks must be run in the user's project environment before staging promotion.
- Product price remains the existing Float field to avoid a risky data migration in this phase. A future migration should convert money fields to integer paise or a properly sized Decimal after a reviewed conversion plan.
- Existing generated Prisma client files in this archive may be stale until `prisma generate` runs after migration/schema update.
