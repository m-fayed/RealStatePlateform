// Idempotent seed: creates (or refreshes) the configured administrator.
// Run with: npm run seed
//
// Requires ADMIN_EMAIL and a strong ADMIN_PASSWORD; see server/SECURITY.md.

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import process from 'node:process';
import { validateAdminConfig } from '../src/lib/security.js';
import prisma from '../src/lib/prisma.js';

const ADMIN_PHONE = process.env.ADMIN_PHONE || '+201000000000';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Platform Admin';

async function main() {
  const { email, password } = validateAdminConfig();
  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { email, password: hash, role: 'admin', status: 'active', name: ADMIN_NAME },
    create: {
      name: ADMIN_NAME,
      email,
      phone: ADMIN_PHONE,
      password: hash,
      role: 'admin',
      status: 'active',
    },
  });

  console.log('Admin ready:');
  console.log(`  phone:    ${admin.phone}`);
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
