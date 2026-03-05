#!/usr/bin/env ts-node

// ensure path aliases work when running via ts-node
import 'tsconfig-paths/register';

/**
 * Script to correct tenant_id values for existing users.
 *
 * Run with `ts-node scripts/fix-tenant-ids.ts` from the project root or
 * compile with tsc and execute with node.
 *
 * This script performs two tasks:
 *   1. Ensure every ADMIN user has tenant_id == user_id.
 *   2. For other users (e.g. SELLER), copy the tenant_id from the
 *      user who created them (created_by) if it is missing or incorrect.
 *
 * Adjust the logic below if you use a different relationship.
 */

import prisma from '../src/database/client';

async function main() {
  console.log('Fixing tenant IDs...');

  // 1. ADMIN users
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  for (const admin of admins) {
    if (admin.tenantId !== admin.userId) {
      console.log(`Updating tenantId for admin ${admin.userId}`);
      await prisma.user.update({
        where: { userId: admin.userId },
        data: { tenantId: admin.userId },
      });
    }
  }

  // 2. Other users: copy tenantId from creator if available
  const others = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: { userId: true, tenantId: true, createdBy: true },
  });
  for (const u of others) {
    if ((u.tenantId == null || u.tenantId === 1) && u.createdBy) {
      const creator = await prisma.user.findUnique({
        where: { userId: u.createdBy },
        select: { tenantId: true },
      });
      if (creator && creator.tenantId && creator.tenantId !== u.tenantId) {
        console.log(`Fixing tenantId for user ${u.userId} -> ${creator.tenantId}`);
        await prisma.user.update({
          where: { userId: u.userId },
          data: { tenantId: creator.tenantId },
        });
      }
    }
  }

  console.log('Tenant ID fix complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
