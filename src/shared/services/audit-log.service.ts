import { prisma } from '@src/shared/config/database';
import { logger } from '@src/shared/utils/logger';

export interface AuditLogData {
  userId?: number;
  action: string;
  resource?: string;
  details?: Record<string, any>;
  entityType?: string;
  entityId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogService {
  /**
   * Create audit log entry
   */
  async createAuditLog(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType ?? data.resource,
          entityId: data.entityId,
          oldValues: data.oldValues as any,
          newValues: data.newValues as any,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error: any) {
      // Handle foreign key constraint violation (invalid userId)
      // P2003 is the Prisma error code for foreign key constraint violation
      const isForeignKeyError = error?.code === 'P2003';
      const constraintName = error?.meta?.driverAdapterError?.cause?.constraint?.index || 
                            error?.meta?.constraint ||
                            '';
      const isUserIdConstraint = constraintName.includes('user_id') || 
                                 constraintName.includes('audit_logs_user_id_fkey') ||
                                 error?.message?.includes('audit_logs_user_id_fkey');
      
      if (isForeignKeyError && isUserIdConstraint) {
        logger.warn(`Invalid user ID ${data.userId} for audit log, retrying without user reference`);
        try {
          // Retry without userId
          await prisma.auditLog.create({
            data: {
              userId: undefined,
              action: data.action,
              entityType: data.entityType ?? data.resource,
              entityId: data.entityId,
              oldValues: data.oldValues as any,
              newValues: data.newValues as any,
              ipAddress: data.ipAddress,
              userAgent: data.userAgent,
            },
          });
        } catch (retryError) {
          logger.error('Failed to create audit log (retry without userId):', retryError);
        }
      } else {
        // Log other errors but don't throw (audit logging should not break main flow)
        logger.error('Failed to create audit log:', error);
      }
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters: {
    userId?: number;
    entityType?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 10, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (whereFilters.userId) where.userId = whereFilters.userId;
    if (whereFilters.entityType) where.entityType = whereFilters.entityType;
    if (whereFilters.action) where.action = whereFilters.action;
    if (whereFilters.dateFrom || whereFilters.dateTo) {
      where.createdAt = {};
      if (whereFilters.dateFrom) where.createdAt.gte = whereFilters.dateFrom;
      if (whereFilters.dateTo) where.createdAt.lte = whereFilters.dateTo;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const auditLogService = new AuditLogService();