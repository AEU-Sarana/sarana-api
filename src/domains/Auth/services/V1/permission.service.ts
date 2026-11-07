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
    const roleUpper = (role || '').toUpperCase();
    const restrictedFeatures = [
      'users.manage',
      'roles.manage',
      'settings.manage',
      'backup.manage',
      'security.audit_logs',
    ];

    // 1. ADMINISTRATOR has 100% full feature access automatically
    if (roleUpper === 'ADMINISTRATOR' || roleUpper === 'SUPER_ADMIN') {
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
      const filtered = roleUpper === 'ADMIN'
        ? assigned.filter((a: { featureKey: string }) => !restrictedFeatures.includes(a.featureKey))
        : assigned;
      return filtered.map((a: { featureKey: string; actions: string }) => ({
        featureKey: a.featureKey,
        actions: a.actions ? (a.actions.split(',') as PermissionAction[]) : ['read'],
      }));
    }

    // 2. Fallback to check Role permissions based on role key if user has a custom role
    const roleRecord = await prisma.role.findFirst({
      where: {
        key: { equals: roleUpper, mode: 'insensitive' },
      },
      include: {
        role_permissions: true,
      },
    });

    if (roleRecord && roleRecord.role_permissions && roleRecord.role_permissions.length > 0) {
      return roleRecord.role_permissions.map((rp: any) => ({
        featureKey: rp.featureKey,
        actions: rp.actions ? (rp.actions.split(',') as PermissionAction[]) : ['read'],
      }));
    }

    // 3. ADMIN has full operational access EXCEPT the 5 restricted permissions
    if (roleUpper === 'ADMIN') {
      return SYSTEM_FEATURES.filter((f) => !restrictedFeatures.includes(f.key)).map((f) => ({
        featureKey: f.key,
        actions: ['all', 'read', 'create', 'update', 'delete'] as PermissionAction[],
      }));
    }

    // Default Cashier permissions if custom permissions haven't been configured yet
    return DEFAULT_CASHIER_PERMISSIONS;
  }

  /**
   * Update feature permissions for a user (Administrator only)
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

    const targetRoleUpper = (targetUser.role || '').toUpperCase();
    if (targetRoleUpper === 'ADMINISTRATOR' || targetRoleUpper === 'SUPER_ADMIN') {
      throw new Error('Cannot modify permissions for Administrator role');
    }

    const validKeys = SYSTEM_FEATURES.map((f) => f.key);
    const restrictedFeatures = [
      'users.manage',
      'roles.manage',
      'settings.manage',
      'backup.manage',
      'security.audit_logs',
    ];

    // Normalize input array whether array of strings or array of { featureKey, actions }
    const normalizedItems: UserPermissionItem[] = [];

    for (const item of permissionsInput) {
      if (typeof item === 'string') {
        if (validKeys.includes(item)) {
          if (targetRoleUpper === 'ADMIN' && restrictedFeatures.includes(item)) {
            continue; // Skip restricted features for ADMIN
          }
          normalizedItems.push({ featureKey: item, actions: ['all'] });
        }
      } else if (item && typeof item === 'object' && item.featureKey) {
        if (validKeys.includes(item.featureKey)) {
          if (targetRoleUpper === 'ADMIN' && restrictedFeatures.includes(item.featureKey)) {
            continue; // Skip restricted features for ADMIN
          }
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
