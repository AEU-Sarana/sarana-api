import prisma from '@src/database/client';
import { DeviceStatus } from '@src/domains/DeviceBinding/enums';
import {
  ListDeviceBindingsRequest,
  ListDeviceBindingsResponse,
  GetDeviceBindingResponse,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  ApproveDeviceResponse,
  RevokeDeviceResponse,
} from '@src/domains/DeviceBinding/types';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';

export class DeviceBindingService {
  /**
   * List device bindings with filters
   */
  static async listDeviceBindings(
    request: ListDeviceBindingsRequest,
    currentUserId: number
  ): Promise<ListDeviceBindingsResponse> {
    const { page = 1, limit = 20, user_id, status } = request;

    // Build where clause
    const where: any = {};

    if (user_id) {
      where.userId = user_id;
    }

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.deviceBinding.count({ where });

    // Get device bindings with pagination
    const skip = (page - 1) * limit;
    const deviceBindings = await prisma.deviceBinding.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
          },
        },
        approvedByUser: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
    });

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_DEVICE_BINDINGS',
      entityType: 'DeviceBinding',
      oldValues: { filters: { user_id, status } },
    });

    return {
      device_bindings: deviceBindings.map((binding) => ({
        binding_id: binding.bindingId,
        user_id: binding.userId,
        seller_name: binding.user.fullName,
        device_id: binding.deviceId,
        device_name: binding.deviceName,
        status: binding.status as DeviceStatus,
        approved_by: binding.approvedBy,
        approved_at: binding.approvedAt,
        created_at: binding.createdAt,
        updated_at: binding.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get device binding by ID
   */
  static async getDeviceBinding(
    bindingId: number,
    currentUserId: number
  ): Promise<GetDeviceBindingResponse> {
    const binding = await prisma.deviceBinding.findUnique({
      where: { bindingId },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
          },
        },
        approvedByUser: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
    });

    if (!binding) {
      throw new ValidationException('Device binding not found');
    }

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_DEVICE_BINDING',
      entityType: 'DeviceBinding',
      entityId: bindingId,
    });

    return {
      binding_id: binding.bindingId,
      user_id: binding.userId,
      seller_name: binding.user.fullName,
      device_id: binding.deviceId,
      device_name: binding.deviceName,
      status: binding.status as DeviceStatus,
      approved_by: binding.approvedBy,
  approved_by_name: binding.approvedByUser?.fullName || null,
      approved_at: binding.approvedAt,
      created_at: binding.createdAt,
      updated_at: binding.updatedAt,
    };
  }

  /**
   * Register device binding
   */
  static async registerDevice(
    request: RegisterDeviceRequest,
    currentUserId: number
  ): Promise<RegisterDeviceResponse> {
    const { device_id, device_name } = request;
    const deviceId = device_id; // Map to database field name
    const deviceName = device_name; // Map to database field name

    // Check if device already exists for this user
    const existingBinding = await prisma.deviceBinding.findFirst({
      where: {
        userId: currentUserId,
        deviceId: deviceId,
      },
    });

    if (existingBinding) {
      // If device is revoked, allow re-registration
      if (existingBinding.status === DeviceStatus.REVOKED) {
        // Update existing binding to pending
        const updatedBinding = await prisma.deviceBinding.update({
          where: { bindingId: existingBinding.bindingId },
          data: {
            deviceName: deviceName,
            status: DeviceStatus.PENDING,
            approvedBy: null,
            approvedAt: null,
            updatedAt: new Date(),
          },
          include: {
            user: {
              select: {
                userId: true,
                fullName: true,
              },
            },
          },
        });

        // Log audit
        await auditLogService.createAuditLog({
          userId: currentUserId,
          action: 'REGISTER_DEVICE',
          entityType: 'DeviceBinding',
          entityId: updatedBinding.bindingId,
          newValues: {
            deviceId: deviceId,
            status: 'PENDING',
            action: 're-registered',
          },
        });

        logger.info('Device re-registered', {
          bindingId: updatedBinding.bindingId,
          userId: currentUserId,
          deviceId: deviceId,
        });

        return {
          binding_id: updatedBinding.bindingId,
          user_id: updatedBinding.userId,
          device_id: updatedBinding.deviceId,
          device_name: updatedBinding.deviceName,
          status: updatedBinding.status as DeviceStatus,
          created_at: updatedBinding.createdAt,
          updated_at: updatedBinding.updatedAt,
        };
      }

      // If device is already approved or pending, return existing binding
      throw new BusinessLogicException('Device already registered for this user');
    }

    // Create new device binding
    const binding = await prisma.deviceBinding.create({
      data: {
        userId: currentUserId,
        deviceId: deviceId,
        deviceName: deviceName,
        status: DeviceStatus.PENDING,
      },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
    });

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'REGISTER_DEVICE',
      entityType: 'DeviceBinding',
      entityId: binding.bindingId,
      newValues: {
        deviceId: deviceId,
        deviceName: deviceName,
        status: 'PENDING',
      },
    });

    logger.info('Device registered', {
      bindingId: binding.bindingId,
      userId: currentUserId,
      deviceId: deviceId,
    });

    return {
      binding_id: binding.bindingId,
      user_id: binding.userId,
      device_id: binding.deviceId,
      device_name: binding.deviceName,
      status: binding.status as DeviceStatus,
      created_at: binding.createdAt,
      updated_at: binding.updatedAt,
    };
  }

  /**
   * Approve device binding
   */
  static async approveDevice(
    bindingId: number,
    currentUserId: number
  ): Promise<ApproveDeviceResponse> {
    // Check if binding exists
    const binding = await prisma.deviceBinding.findUnique({
      where: { bindingId },
    });

    if (!binding) {
      throw new ValidationException('Device binding not found');
    }

    // Check if already approved
    if (binding.status === DeviceStatus.APPROVED) {
      throw new BusinessLogicException('Device is already approved');
    }

    // Approve device
    const updatedBinding = await prisma.deviceBinding.update({
      where: { bindingId },
      data: {
        status: DeviceStatus.APPROVED,
        approvedBy: currentUserId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'APPROVE_DEVICE',
      entityType: 'DeviceBinding',
      entityId: bindingId,
      newValues: {
        userId: binding.userId,
        deviceId: binding.deviceId,
      },
    });

    logger.info('Device approved', {
      bindingId,
      userId: binding.userId,
      deviceId: binding.deviceId,
      approvedBy: currentUserId,
    });

    return {
      binding_id: updatedBinding.bindingId,
      status: updatedBinding.status as DeviceStatus,
      approved_by: updatedBinding.approvedBy!, // Non-null assertion since we just set it
      approved_at: updatedBinding.approvedAt!, // Non-null assertion since we just set it
      updated_at: updatedBinding.updatedAt,
    };
  }

  /**
   * Revoke device binding
   */
  static async revokeDevice(
    bindingId: number,
    currentUserId: number
  ): Promise<RevokeDeviceResponse> {
    // Check if binding exists
    const binding = await prisma.deviceBinding.findUnique({
      where: { bindingId },
    });

    if (!binding) {
      throw new ValidationException('Device binding not found');
    }

    // Check if already revoked
    if (binding.status === DeviceStatus.REVOKED) {
      throw new BusinessLogicException('Device is already revoked');
    }

    // Revoke device
    const updatedBinding = await prisma.deviceBinding.update({
      where: { bindingId },
      data: {
        status: DeviceStatus.REVOKED,
        updatedAt: new Date(),
      },
    });

    // Log audit
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'REVOKE_DEVICE',
      entityType: 'DeviceBinding',
      entityId: bindingId,
      newValues: {
        userId: binding.userId,
        deviceId: binding.deviceId,
      },
    });

    logger.info('Device revoked', {
      bindingId,
      userId: binding.userId,
      deviceId: binding.deviceId,
      revokedBy: currentUserId,
    });

    return {
      binding_id: updatedBinding.bindingId,
      status: updatedBinding.status as DeviceStatus,
      revoked_by: currentUserId,
      revoked_at: updatedBinding.updatedAt, // Use updatedAt as revoked_at
      updated_at: updatedBinding.updatedAt,
    };
  }

  /**
   * Remove device binding (hard delete)
   */
  static async removeDevice(
    bindingId: number,
    currentUserId: number
  ): Promise<void> {
    // Check if binding exists
    const binding = await prisma.deviceBinding.findUnique({
      where: { bindingId },
    });

    if (!binding) {
      throw new ValidationException('Device binding not found');
    }

    // Log audit before deletion
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'REMOVE_DEVICE',
      entityType: 'DeviceBinding',
      entityId: bindingId,
      newValues: {
        userId: binding.userId,
        deviceId: binding.deviceId,
      },
    });

    // Hard delete
    await prisma.deviceBinding.delete({
      where: { bindingId },
    });

    logger.info('Device binding removed', {
      bindingId,
      userId: binding.userId,
      deviceId: binding.deviceId,
      removedBy: currentUserId,
    });
  }
}