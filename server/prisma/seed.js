// Idempotent seed: creates (or refreshes) the dev admin user.
// Run with: npm run seed
//
// Override the defaults via env vars:
//   ADMIN_PHONE=+201111111111 ADMIN_PASSWORD=mypass node prisma/seed.js

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma.js';

const ADMIN_PHONE = process.env.ADMIN_PHONE || '+201000000000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Platform Admin';

async function main() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { password: hash, role: 'admin', status: 'active', name: ADMIN_NAME },
    create: {
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
      password: hash,
      role: 'admin',
      status: 'active',
    },
  });

  console.log('Admin ready:');
  console.log(`  phone:    ${admin.phone}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log(`  id:       ${admin.id}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
