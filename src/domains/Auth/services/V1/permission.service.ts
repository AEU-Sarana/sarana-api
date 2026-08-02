import prisma from '@src/database/client';
import {
  SYSTEM_FEATURES,
  DEFAULT_CASHIER_PERMISSIONS,
  UserPermissionItem,
  PermissionAction,
} from '@src/shared/constants/permissions';
import { logger } from '@src/shared/utils/logger';

export class PermissionService {
  /**
   * Get feature permissions for a user
   */
  async getUserPermissions(userId: number, role: string): Promise<UserPermissionItem[]> {
    // ADMIN has 100% full feature access automatically
    if (role === 'ADMIN') {
      return SYSTEM_FEATURES.map((f) => ({
        featureKey: f.key,
        actions: ['all', 'read', 'create', 'update', 'delete'] as PermissionAction[],
      }));
    }

    const assigned = await prisma.userPermission.findMany({
      where: { userId },
      select: { featureKey: true, actions: true },
    });

    if (assigned.length > 0) {
      return assigned.map((a: { featureKey: string; actions: string }) => ({
        featureKey: a.featureKey,
        actions: a.actions ? (a.actions.split(',') as PermissionAction[]) : ['read'],
      }));
    }

    // Default Cashier permissions if custom permissions haven't been configured yet
    return DEFAULT_CASHIER_PERMISSIONS;
  }

  /**
   * Update feature permissions for a user (Admin only)
   */
  async updateUserPermissions(
    targetUserId: number,
    permissionsInput: any[],
    grantedBy: number
  ): Promise<UserPermissionItem[]> {
    const targetUser = await prisma.user.findUnique({
      where: { userId: targetUserId },
      select: { userId: true, role: true },
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUser.role === 'ADMIN') {
      return SYSTEM_FEATURES.map((f) => ({
        featureKey: f.key,
        actions: ['all', 'read', 'create', 'update', 'delete'] as PermissionAction[],
      }));
    }

    const validKeys = SYSTEM_FEATURES.map((f) => f.key);

    // Normalize input array whether array of strings or array of { featureKey, actions }
    const normalizedItems: UserPermissionItem[] = [];

    for (const item of permissionsInput) {
      if (typeof item === 'string') {
        if (validKeys.includes(item)) {
          normalizedItems.push({ featureKey: item, actions: ['all'] });
        }
      } else if (item && typeof item === 'object' && item.featureKey) {
        if (validKeys.includes(item.featureKey)) {
          const actionsArr = Array.isArray(item.actions) && item.actions.length > 0 ? item.actions : ['read'];
          normalizedItems.push({
            featureKey: item.featureKey,
            actions: actionsArr,
          });
        }
      }
    }

    await prisma.$transaction(async (tx: any) => {
      // Remove current permissions
      await tx.userPermission.deleteMany({
        where: { userId: targetUserId },
      });

      // Insert new granted feature permissions with actions
      if (normalizedItems.length > 0) {
        await tx.userPermission.createMany({
          data: normalizedItems.map((item) => ({
            userId: targetUserId,
            featureKey: item.featureKey,
            actions: item.actions.join(','),
            grantedBy,
          })),
        });
      }
    });

    logger.info('User permissions updated', {
      targetUserId,
      grantedBy,
      count: normalizedItems.length,
    });

    return normalizedItems;
  }
}
