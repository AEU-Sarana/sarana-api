import prisma from '@src/database/client';
import { SYSTEM_FEATURES, DEFAULT_CASHIER_PERMISSIONS } from '@src/shared/constants/permissions';
import { logger } from '@src/shared/utils/logger';

export class PermissionService {
  /**
   * Get feature permissions for a user
   */
  async getUserPermissions(userId: number, role: string): Promise<string[]> {
    // ADMIN has 100% full feature access automatically
    if (role === 'ADMIN') {
      return SYSTEM_FEATURES.map((f) => f.key);
    }

    const assigned = await prisma.userPermission.findMany({
      where: { userId },
      select: { featureKey: true },
    });

    if (assigned.length > 0) {
      return assigned.map((a: { featureKey: string }) => a.featureKey);
    }

    // Default Cashier permissions if custom permissions haven't been configured yet
    return DEFAULT_CASHIER_PERMISSIONS;
  }

  /**
   * Update feature permissions for a user (Admin only)
   */
  async updateUserPermissions(
    targetUserId: number,
    featureKeys: string[],
    grantedBy: number
  ): Promise<string[]> {
    const targetUser = await prisma.user.findUnique({
      where: { userId: targetUserId },
      select: { userId: true, role: true },
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUser.role === 'ADMIN') {
      return SYSTEM_FEATURES.map((f) => f.key);
    }

    // Filter valid system features only
    const validKeys = SYSTEM_FEATURES.map((f) => f.key);
    const filteredKeys = [...new Set(featureKeys.filter((k) => validKeys.includes(k)))];

    await prisma.$transaction(async (tx: any) => {
      // Remove current permissions
      await tx.userPermission.deleteMany({
        where: { userId: targetUserId },
      });

      // Insert new granted feature permissions
      if (filteredKeys.length > 0) {
        await tx.userPermission.createMany({
          data: filteredKeys.map((key) => ({
            userId: targetUserId,
            featureKey: key,
            grantedBy,
          })),
        });
      }
    });

    logger.info('User permissions updated', {
      targetUserId,
      grantedBy,
      count: filteredKeys.length,
    });

    return filteredKeys;
  }
}
