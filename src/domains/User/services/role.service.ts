import prisma from '@src/database/client';
import {
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleResponse,
} from '../types/role.types';
import { BusinessLogicException, ValidationException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { logger } from '@src/shared/utils/logger';

export class RoleService {
  /**
   * List all roles with permission details and user count
   */
  static async listRoles(): Promise<RoleResponse[]> {
    const roles = await prisma.role.findMany({
      include: {
        role_permissions: true,
      },
      orderBy: { roleId: 'asc' },
    });

    // Get user count per role key
    const userCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { userId: true },
    });

    const userCountMap = new Map<string, number>();
    for (const uc of userCounts) {
      if (uc.role) {
        userCountMap.set(uc.role.toUpperCase(), uc._count.userId);
      }
    }

    return roles.map((role) => ({
      role_id: role.roleId,
      key: role.key,
      name: role.name,
      description: role.description,
      is_system: role.isSystem,
      user_count: userCountMap.get(role.key.toUpperCase()) || 0,
      permissions: (role.role_permissions || []).map((p) => ({
        feature_key: p.featureKey,
        actions: p.actions ? p.actions.split(',') : ['read'],
      })),
      created_at: role.createdAt,
      updated_at: role.updatedAt,
    }));
  }

  /**
   * Get role details by ID
   */
  static async getRole(roleId: number): Promise<RoleResponse> {
    const role = await prisma.role.findUnique({
      where: { roleId: roleId },
      include: {
        role_permissions: true,
      },
    });

    if (!role) {
      throw new ValidationException('Role not found');
    }

    const userCount = await prisma.user.count({
      where: { role: role.key },
    });

    return {
      role_id: role.roleId,
      key: role.key,
      name: role.name,
      description: role.description,
      is_system: role.isSystem,
      user_count: userCount,
      permissions: (role.role_permissions || []).map((p) => ({
        feature_key: p.featureKey,
        actions: p.actions ? p.actions.split(',') : ['read'],
      })),
      created_at: role.createdAt,
      updated_at: role.updatedAt,
    };
  }

  /**
   * Create a new custom role
   */
  static async createRole(
    request: CreateRoleRequest,
    currentUserId: number
  ): Promise<RoleResponse> {
    const { key: rawKey, name, description, permissions } = request;
    const key = rawKey.trim().toUpperCase().replace(/\s+/g, '_');

    if (!key || !name) {
      throw new ValidationException('Role key and name are required');
    }

    // Check if key already exists
    const existing = await prisma.role.findFirst({
      where: { key: { equals: key, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ValidationException(`Role key '${key}' already exists`);
    }

    // Create role with permissions in transaction
    const newRole = await prisma.$transaction(async (tx) => {
      const createdRole = await tx.role.create({
        data: {
          key,
          name,
          description,
          isSystem: false,
        },
      });

      if (permissions && permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: createdRole.roleId,
            featureKey: p.feature_key,
            actions: Array.isArray(p.actions) ? p.actions.join(',') : p.actions || 'read',
          })),
        });
      }

      return tx.role.findUnique({
        where: { roleId: createdRole.roleId },
        include: { role_permissions: true },
      });
    });

    if (!newRole) {
      throw new BusinessLogicException('Failed to create role');
    }

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'CREATE_ROLE',
      entityType: 'Role',
      entityId: newRole.roleId,
      newValues: { key, name, permissions },
    });

    logger.info('Custom role created', { roleId: newRole.roleId, key, createdBy: currentUserId });

    return {
      role_id: newRole.roleId,
      key: newRole.key,
      name: newRole.name,
      description: newRole.description,
      is_system: newRole.isSystem,
      user_count: 0,
      permissions: (newRole.role_permissions || []).map((p) => ({
        feature_key: p.featureKey,
        actions: p.actions ? p.actions.split(',') : ['read'],
      })),
      created_at: newRole.createdAt,
      updated_at: newRole.updatedAt,
    };
  }

  /**
   * Update custom role details and permission matrix
   */
  static async updateRole(
    roleId: number,
    request: UpdateRoleRequest,
    currentUserId: number
  ): Promise<RoleResponse> {
    const existingRole = await prisma.role.findUnique({
      where: { roleId: roleId },
      include: { role_permissions: true },
    });

    if (!existingRole) {
      throw new ValidationException('Role not found');
    }

    const { name, description, permissions } = request;

    const updatedRole = await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { roleId: roleId },
        data: {
          ...(name ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          updatedAt: new Date(),
        },
      });

      if (permissions !== undefined) {
        // Clear existing permissions for role
        await tx.rolePermission.deleteMany({
          where: { roleId: roleId },
        });

        // Insert new permissions
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleId: roleId,
              featureKey: p.feature_key,
              actions: Array.isArray(p.actions) ? p.actions.join(',') : p.actions || 'read',
            })),
          });
        }
      }

      return tx.role.findUnique({
        where: { roleId: roleId },
        include: { role_permissions: true },
      });
    });

    if (!updatedRole) {
      throw new BusinessLogicException('Failed to update role');
    }

    const userCount = await prisma.user.count({
      where: { role: updatedRole.key },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'UPDATE_ROLE',
      entityType: 'Role',
      entityId: roleId,
      newValues: { name, description, permissions },
    });

    logger.info('Role updated', { roleId, key: updatedRole.key, updatedBy: currentUserId });

    return {
      role_id: updatedRole.roleId,
      key: updatedRole.key,
      name: updatedRole.name,
      description: updatedRole.description,
      is_system: updatedRole.isSystem,
      user_count: userCount,
      permissions: (updatedRole.role_permissions || []).map((p) => ({
        feature_key: p.featureKey,
        actions: p.actions ? p.actions.split(',') : ['read'],
      })),
      created_at: updatedRole.createdAt,
      updated_at: updatedRole.updatedAt,
    };
  }

  /**
   * Delete custom role
   */
  static async deleteRole(roleId: number, currentUserId: number): Promise<void> {
    const existingRole = await prisma.role.findUnique({
      where: { roleId: roleId },
    });

    if (!existingRole) {
      throw new ValidationException('Role not found');
    }

    if (existingRole.isSystem) {
      throw new BusinessLogicException('System roles (ADMIN/CASHIER) cannot be deleted');
    }

    // Check if any users are assigned to this role
    const assignedUserCount = await prisma.user.count({
      where: { role: existingRole.key },
    });

    if (assignedUserCount > 0) {
      throw new BusinessLogicException(
        `Cannot delete role '${existingRole.name}' because ${assignedUserCount} user(s) are assigned to it.`
      );
    }

    await prisma.role.delete({
      where: { roleId: roleId },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'DELETE_ROLE',
      entityType: 'Role',
      entityId: roleId,
      oldValues: { key: existingRole.key, name: existingRole.name },
    });

    logger.info('Role deleted', { roleId, key: existingRole.key, deletedBy: currentUserId });
  }
}
