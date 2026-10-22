-- Give every existing account a permanent, unique public Therynox identifier.
ALTER TABLE "User" ADD COLUMN "therynoxId" TEXT;

UPDATE "User"
SET "therynoxId" = 'THY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE "therynoxId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "therynoxId" SET NOT NULL;
CREATE UNIQUE INDEX "User_therynoxId_key" ON "User"("therynoxId");
