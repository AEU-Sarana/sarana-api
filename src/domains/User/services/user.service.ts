import bcrypt from 'bcryptjs';
import { env } from '@src/shared/config/env';
import prisma from '@src/database/client';
import { UserRole, UserStatus } from '@src/domains/User/enums';
import {
  ListUsersRequest,
  ListUsersResponse,
  GetUserResponse,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  DeactivateUserResponse,
} from '@src/domains/User/types/user.types';
import { BusinessLogicException, ValidationException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { paginate } from '@src/shared/utils/helpers';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { hashPIN } from '@src/shared/services/pin.service';
import { SYSTEM_FEATURES, DEFAULT_CASHIER_PERMISSIONS } from '@src/shared/constants/permissions';

export class UserService {
  /**
   * List users with filters
   */
  static async listUsers(
    request: ListUsersRequest,
    currentUser: { userId: number; role: string; tenantId?: number }
  ): Promise<ListUsersResponse> {
    const { page = 1, limit = 20, role, status, search } = request;
    const { role: currentUserRole, tenantId: currentUserTenantId } = currentUser;

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role;
    }

    // Single tenant environment - no tenant scope checks needed

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const skip = (page - 1) * limit;
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        deviceId: true,
        createdAt: true,
        updatedAt: true,
        user_permissions: {
          select: { featureKey: true },
        },
      },
    });

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUser.userId,
      action: 'LIST_USERS',
      entityType: 'User',
      oldValues: { filters: { role, status, search } },
    });

    return {
      users: users.map((user) => {
        const uRole = (user.role || '').toUpperCase();
        const hasCustomPermissions = user.user_permissions && user.user_permissions.length > 0;
        const allowDashboard =
          uRole === 'ADMINISTRATOR' ||
          uRole === 'SUPER_ADMIN' ||
          (hasCustomPermissions && user.user_permissions.some((p: any) => p.featureKey === 'dashboard.view')) ||
          (!hasCustomPermissions && uRole === 'ADMIN');

        return {
          user_id: user.userId,
          username: user.username,
          email: user.email,
          full_name: user.fullName,
          role: user.role as UserRole,
          phone: user.phone,
          status: user.status as UserStatus,
          device_id: user.deviceId,
          allow_dashboard: allowDashboard,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List sellers only
   */
  static async listCashiers(
    request: { page?: number; limit?: number; status?: UserStatus; search?: string },
    currentUser: { userId: number; role: string; tenantId?: number }
  ): Promise<ListUsersResponse> {
    return this.listUsers(
      {
        ...request,
        role: UserRole.CASHIER,
      },
      currentUser
    );
  }

  /**
   * Get user by ID
   */
  static async getUser(userId: number, currentUserId: number): Promise<GetUserResponse> {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        deviceId: true,
        createdBy: true,
        createdAt: true,
        updatedBy: true,
        updatedAt: true,
        deactivatedDate: true,
        user_permissions: {
          select: { featureKey: true },
        },
      },
    });

    if (!user) {
      throw new ValidationException('User not found');
    }

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_USER',
      entityType: 'User',
      entityId: userId,
    });

    const uRole = (user.role || '').toUpperCase();
    const hasCustomPermissions = user.user_permissions && user.user_permissions.length > 0;
    const allowDashboard =
      uRole === 'ADMINISTRATOR' ||
      uRole === 'SUPER_ADMIN' ||
      (hasCustomPermissions && user.user_permissions.some((p: any) => p.featureKey === 'dashboard.view')) ||
      (!hasCustomPermissions && uRole === 'ADMIN');

    return {
      user_id: user.userId,
      username: user.username,
      email: user.email,
      full_name: user.fullName,
      role: user.role as UserRole,
      phone: user.phone,
      status: user.status as UserStatus,
      device_id: user.deviceId,
      allow_dashboard: allowDashboard,
      created_by: user.createdBy,
      created_at: user.createdAt,
      updated_by: user.updatedBy,
      updated_at: user.updatedAt,
      deactivated_date: user.deactivatedDate,
    };
  }

  /**
   * Create user/cashier
   */
  static async createUser(
    request: CreateUserRequest,
    currentUser: { userId: number; tenantId?: number }
  ): Promise<CreateUserResponse> {
    const { username, email, full_name, password, phone, role, allow_dashboard } = request;
    const fullName = full_name; // Map snake_case to camelCase for database
    const { userId: currentUserId, tenantId: currentUserTenantId } = currentUser;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ValidationException('Username already exists');
    }


    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email },
      });

      if (existingEmail) {
        throw new ValidationException('Email already exists');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        fullName,
        passwordHash,
        phone,
        role: role as string,
        status: UserStatus.ACTIVE,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.userId,
      newValues: {
        username: user.username,
        role: user.role,
      },
    });

    // Setup initial granular permissions if role is not Administrator
    const targetRoleUpper = (role as string || '').toUpperCase();
    if (targetRoleUpper !== 'ADMINISTRATOR' && targetRoleUpper !== 'SUPER_ADMIN') {
      const restrictedFeatures = [
        'users.manage',
        'roles.manage',
        'settings.manage',
        'backup.manage',
        'security.audit_logs',
      ];

      let basePermissions: { featureKey: string; actions: string }[] = [];

      // Check if custom role exists in database
      const roleRecord = await prisma.role.findFirst({
        where: { key: { equals: role as string, mode: 'insensitive' } },
        include: { role_permissions: true },
      });

      if (roleRecord && roleRecord.role_permissions && roleRecord.role_permissions.length > 0) {
        basePermissions = roleRecord.role_permissions.map((rp: any) => ({
          featureKey: rp.featureKey,
          actions: rp.actions || 'read',
        }));
      } else if (targetRoleUpper === 'ADMIN') {
        basePermissions = SYSTEM_FEATURES.filter((f) => !restrictedFeatures.includes(f.key)).map((f) => ({
          featureKey: f.key,
          actions: 'all,read,create,update,delete',
        }));
      } else {
        basePermissions = DEFAULT_CASHIER_PERMISSIONS.map((f) => ({
          featureKey: f.featureKey,
          actions: f.actions.join(','),
        }));
      }

      const shouldAllowDashboard = allow_dashboard !== undefined ? Boolean(allow_dashboard) : (targetRoleUpper === 'ADMIN');
      const filteredPermissions = basePermissions.filter((p) => p.featureKey !== 'dashboard.view');
      if (shouldAllowDashboard) {
        filteredPermissions.push({
          featureKey: 'dashboard.view',
          actions: 'all,read',
        });
      }

      if (filteredPermissions.length > 0) {
        await prisma.userPermission.createMany({
          data: filteredPermissions.map((p) => ({
            userId: user.userId,
            featureKey: p.featureKey,
            actions: p.actions,
            grantedBy: currentUserId,
          })),
        });
      }
    }

    logger.info('User created', {
      userId: user.userId,
      username: user.username,
      role: user.role,
      createdBy: currentUserId,
    });

    return {
      user_id: user.userId,
      username: user.username,
      email: user.email,
      full_name: user.fullName,
      role: user.role as UserRole,
      phone: user.phone,
      status: user.status as UserStatus,
      allow_dashboard: targetRoleUpper === 'ADMINISTRATOR' || Boolean(allow_dashboard),
      created_by: user.createdBy,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  /**
   * Update user/cashier
   */
  static async updateUser(
    userId: number,
    request: UpdateUserRequest,
    currentUserId: number
  ): Promise<UpdateUserResponse> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { userId },
    });

    if (!existingUser) {
      throw new ValidationException('User not found');
    }

    // Check if email already exists (if provided and changed)
    if (request.email && request.email !== existingUser.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: request.email,
          userId: { not: userId },
        },
      });

      if (existingEmail) {
        throw new ValidationException('Email already exists');
      }
    }

    // Build update data
    const updateData: any = {
      updatedBy: currentUserId,
      updatedAt: new Date(),
    };

    if (request.full_name !== undefined) {
      updateData.fullName = request.full_name; // Map snake_case to camelCase
    }

    if (request.email !== undefined) {
      updateData.email = request.email;
    }

    if (request.phone !== undefined) {
      updateData.phone = request.phone;
    }

    if (request.role !== undefined) {
      updateData.role = request.role;
    }

    if (request.password && request.password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(request.password, env.BCRYPT_SALT_ROUNDS);
    }

    if (request.status !== undefined) {
      updateData.status = request.status;
      
      // If deactivating, set deactivated_date
      if (request.status === UserStatus.INACTIVE && existingUser.status === UserStatus.ACTIVE) {
        updateData.deactivatedDate = new Date();
      }
      
      // If reactivating, clear deactivated_date
      if (request.status === UserStatus.ACTIVE && existingUser.status === UserStatus.INACTIVE) {
        updateData.deactivatedDate = null;
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        userId: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        updatedBy: true,
        updatedAt: true,
      },
    });

    // Update allow_dashboard if specified
    const finalRole = (request.role || existingUser.role || '').toUpperCase();
    if (finalRole !== 'ADMINISTRATOR' && finalRole !== 'SUPER_ADMIN') {
      if (request.allow_dashboard !== undefined) {
        const existingPermissions = await prisma.userPermission.findMany({
          where: { userId },
        });

        if (existingPermissions.length > 0) {
          if (request.allow_dashboard) {
            await prisma.userPermission.upsert({
              where: {
                userId_featureKey: {
                  userId,
                  featureKey: 'dashboard.view',
                },
              },
              update: {
                actions: 'all,read',
                grantedBy: currentUserId,
              },
              create: {
                userId,
                featureKey: 'dashboard.view',
                actions: 'all,read',
                grantedBy: currentUserId,
              },
            });
          } else {
            await prisma.userPermission.deleteMany({
              where: {
                userId,
                featureKey: 'dashboard.view',
              },
            });
          }
        } else {
          const restrictedFeatures = [
            'users.manage',
            'roles.manage',
            'settings.manage',
            'backup.manage',
            'security.audit_logs',
          ];

          let basePermissions: { featureKey: string; actions: string }[] = [];
          const roleRecord = await prisma.role.findFirst({
            where: { key: { equals: finalRole, mode: 'insensitive' } },
            include: { role_permissions: true },
          });

          if (roleRecord && roleRecord.role_permissions && roleRecord.role_permissions.length > 0) {
            basePermissions = roleRecord.role_permissions.map((rp: any) => ({
              featureKey: rp.featureKey,
              actions: rp.actions || 'read',
            }));
          } else if (finalRole === 'ADMIN') {
            basePermissions = SYSTEM_FEATURES.filter((f) => !restrictedFeatures.includes(f.key)).map((f) => ({
              featureKey: f.key,
              actions: 'all,read,create,update,delete',
            }));
          } else {
            basePermissions = DEFAULT_CASHIER_PERMISSIONS.map((f) => ({
              featureKey: f.featureKey,
              actions: f.actions.join(','),
            }));
          }

          const filteredPermissions = basePermissions.filter((p) => p.featureKey !== 'dashboard.view');
          if (request.allow_dashboard) {
            filteredPermissions.push({
              featureKey: 'dashboard.view',
              actions: 'all,read',
            });
          }

          if (filteredPermissions.length > 0) {
            await prisma.userPermission.createMany({
              data: filteredPermissions.map((p) => ({
                userId,
                featureKey: p.featureKey,
                actions: p.actions,
                grantedBy: currentUserId,
              })),
            });
          }
        }
      }
    }

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: userId,
      newValues: {
        changes: request,
      },
    });

    logger.info('User updated', {
      userId,
      updatedBy: currentUserId,
      changes: request,
    });

    return {
      user_id: user.userId,
      username: user.username,
      full_name: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status as UserStatus,
      updated_by: user.updatedBy,
      updated_at: user.updatedAt,
    };
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivateUser(
    userId: number,
    currentUserId: number
  ): Promise<DeactivateUserResponse> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new ValidationException('User not found');
    }

    // Prevent deactivating self
    if (userId === currentUserId) {
      throw new BusinessLogicException('Cannot deactivate your own account');
    }

    // Check if already inactive
    if (user.status === UserStatus.INACTIVE) {
      throw new BusinessLogicException('User is already inactive');
    }

    // Soft delete (set status to inactive)
    const updatedUser = await prisma.user.update({
      where: { userId },
      data: {
        status: UserStatus.INACTIVE,
        deactivatedDate: new Date(),
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        status: true,
        deactivatedDate: true,
      },
    });

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'DEACTIVATE_USER',
      entityType: 'User',
      entityId: userId,
      oldValues: {
        username: user.username,
        status: user.status,
      },
    });

    logger.info('User deactivated', {
      userId,
      username: user.username,
      deactivatedBy: currentUserId,
    });

    return {
      user_id: updatedUser.userId,
      status: updatedUser.status as UserStatus,
      deactivated_date: updatedUser.deactivatedDate,
      deactivated_by: currentUserId,
    };
  }

  
  /**
   * Set user PIN
  */
  static async setUserPIN(
    userId: number,
    pin: string,
    currentUserId: number
  ): Promise<void> {
    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.deactivatedDate) {
      throw new ValidationException('User not found');
    }

    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      throw new ValidationException('PIN must be 4-6 numeric digits');
    }

    // Hash PIN
    const pinHash = await hashPIN(pin);

    // Update user PIN
    await prisma.user.update({
      where: { userId },
      data: {
        pinHash: pinHash,
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'SET_USER_PIN',
      resource: 'User',
      entityId: userId,
      details: { targetUserId: userId },
    });

    logger.info('User PIN set', { userId, setBy: currentUserId });
  }
}
