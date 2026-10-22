import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole, SellerStatus } from '../generated/prisma/client';

/**
 * Development-only, idempotent test-account seeder.
 * It creates missing accounts only. Existing users are never changed or deleted.
 */
function createTherynoxId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += alphabet[randomInt(0, alphabet.length)];
  return `THY-${suffix}`;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed test accounts when NODE_ENV=production.');
  }
  if (process.env.ENABLE_TEST_ACCOUNTS !== 'true') {
    throw new Error('Set ENABLE_TEST_ACCOUNTS=true in apps/api/.env to explicitly enable test-account seeding.');
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is missing from apps/api/.env');
  const password = process.env.TEST_ACCOUNT_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set TEST_ACCOUNT_PASSWORD to a development-only password of at least 12 characters.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const accounts: Array<{ name: string; email: string; role: UserRole; sellerStatus?: SellerStatus }> = [
    { name: 'Therynox Test Super Admin', email: 'superadmin@therynox.test', role: UserRole.SUPER_ADMIN },
    { name: 'Therynox Test Main Admin', email: 'mainadmin@therynox.test', role: UserRole.MAIN_ADMIN },
    { name: 'Therynox Test CEO', email: 'ceo@therynox.test', role: UserRole.CEO },
    { name: 'Therynox Test Manager', email: 'manager@therynox.test', role: UserRole.MANAGER },
    { name: 'Therynox Test Admin Staff', email: 'staff@therynox.test', role: UserRole.ADMIN_STAFF },
    { name: 'Therynox Test Seller', email: 'seller@therynox.test', role: UserRole.SELLER, sellerStatus: SellerStatus.APPROVED },
    { name: 'Therynox Test Supplier', email: 'supplier@therynox.test', role: UserRole.SUPPLIER },
    { name: 'Therynox Test Customer', email: 'customer@therynox.test', role: UserRole.CUSTOMER },
  ];

  try {
    await prisma.$connect();
    const passwordHash = await bcrypt.hash(password, 12);
    let created = 0;
    let skipped = 0;
    for (const account of accounts) {
      const existing = await prisma.user.findUnique({ where: { email: account.email }, select: { id: true } });
      if (existing) {
        console.log(`SKIP existing account (left unchanged): ${account.email}`);
        skipped++;
        continue;
      }
      await prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          therynoxId: createTherynoxId(),
          password: passwordHash,
          role: account.role,
          ...(account.sellerStatus ? { sellerStatus: account.sellerStatus } : {}),
        },
      });
      console.log(`CREATED ${account.role.padEnd(12)} ${account.email}`);
      created++;
    }
    console.log(`\nFinished. Created: ${created}; skipped existing: ${skipped}. No existing records were modified or deleted.`);
    console.log('All newly created test accounts use the TEST_ACCOUNT_PASSWORD value you supplied.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Test-account seeding failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
