import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { userSeedData } from './user-seed-data';

export class UserSeeder extends BaseSeeder {
  name = 'Users';

  async seed(): Promise<void> {
    // Clear existing users (except if you want to keep them)
    // await this.clearTable('users');

    let adminUserId: number | null = null;

    for (const userData of userSeedData) {
      const user: { userId: number; role: string } = await prisma.user.upsert({
        where: { username: userData.username },
        update: {
          email: userData.email,
          passwordHash: userData.passwordHash,
          fullName: userData.fullName,
          role: userData.role,
          phone: userData.phone,
          status: userData.status,
          deviceId: userData.deviceId,
          isDeviceBound: userData.isDeviceBound || false,
          tenantId: userData.tenantId,
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
          isDeviceBound: userData.isDeviceBound || false,
          tenantId: userData.tenantId,
          createdBy: adminUserId, // Will be null for first user
        },
      });

      // Store admin user ID for self-reference
      if (user.role === 'ADMIN' && !adminUserId) {
        adminUserId = user.userId;
      }
    }

    // Update createdBy for all users to point to admin
    if (adminUserId) {
      await prisma.user.updateMany({
        where: { createdBy: null },
        data: { createdBy: adminUserId },
      });
    }

    console.log(`   Created/Updated ${userSeedData.length} users`);
  }
}
