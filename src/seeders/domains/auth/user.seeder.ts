import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { userSeedData } from './user-seed-data';
import { DEFAULT_CASHIER_PERMISSIONS } from '../../../shared/constants/permissions';

export class UserSeeder extends BaseSeeder {
  name = 'Users';

  async seed(): Promise<void> {
    // Clear existing users (except if you want to keep them)
    // await this.clearTable('users');

    const usersByUsername = new Map<
      string,
      { userId: number; role: string; tenantId: number }
    >();

    for (const userData of userSeedData) {
      const user = await prisma.user.upsert({
        where: { username: userData.username },
        update: {
          email: userData.email,
          passwordHash: userData.passwordHash,
          pinHash: userData.pinHash,
          fullName: userData.fullName,
          role: userData.role,
          phone: userData.phone,
          status: userData.status,
          deviceId: userData.deviceId,
        },
        create: {
          username: userData.username,
          email: userData.email,
          passwordHash: userData.passwordHash,
          pinHash: userData.pinHash,
          fullName: userData.fullName,
          role: userData.role,
          phone: userData.phone,
          status: userData.status,
          deviceId: userData.deviceId,
        },
        select: {
          userId: true,
          role: true,
        },
      });

      usersByUsername.set(userData.username, {
        userId: user.userId,
        role: user.role,
        tenantId: userData.tenantId,
      });
    }

    const adminIdByTenant = new Map<number, number>();
    for (const user of usersByUsername.values()) {
      if (user.role === 'ADMIN' && !adminIdByTenant.has(user.tenantId)) {
        adminIdByTenant.set(user.tenantId, user.userId);
      }
    }

    for (const userData of userSeedData) {
      const seededUser = usersByUsername.get(userData.username);
      if (!seededUser) {
        continue;
      }

      let createdBy: number | undefined;

      if (userData.createdByUsername) {
        const creator = usersByUsername.get(userData.createdByUsername);
        if (!creator) {
          throw new Error(
            `Invalid createdByUsername "${userData.createdByUsername}" for user "${userData.username}"`,
          );
        }
        createdBy = creator.userId;
      } else if (seededUser.role === 'ADMIN') {
        createdBy = seededUser.userId;
      } else {
        createdBy = adminIdByTenant.get(userData.tenantId);
      }

      if (createdBy) {
        await prisma.user.update({
          where: { userId: seededUser.userId },
          data: { createdBy },
        });
      }
    }

    // Seed default permissions for CASHIER users if none assigned
    const adminUser = Array.from(usersByUsername.values()).find((u) => u.role === 'ADMIN');
    const adminId = adminUser ? adminUser.userId : 1;

    for (const user of usersByUsername.values()) {
      if (user.role === 'CASHIER') {
        const existingCount = await prisma.userPermission.count({
          where: { userId: user.userId },
        });

        if (existingCount === 0) {
          for (const perm of DEFAULT_CASHIER_PERMISSIONS) {
            await prisma.userPermission.create({
              data: {
                userId: user.userId,
                featureKey: perm.featureKey,
                actions: perm.actions.join(','),
                grantedBy: adminId,
              },
            });
          }
        }
      }
    }

    console.log(`   Created/Updated ${userSeedData.length} users with default permissions`);
  }
}
