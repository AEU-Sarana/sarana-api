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
   * Get audit logs with rich filters, search, and sorting
   */
  async getAuditLogs(filters: {
    userId?: number;
    entityType?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', ...whereFilters } = filters;
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

    if (whereFilters.search) {
      const searchStr = whereFilters.search.trim();
      where.OR = [
        { action: { contains: searchStr, mode: 'insensitive' } },
        { entityType: { contains: searchStr, mode: 'insensitive' } },
        { ipAddress: { contains: searchStr } },
        {
          user: {
            OR: [
              { username: { contains: searchStr, mode: 'insensitive' } },
              { fullName: { contains: searchStr, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Determine sort field
    const allowedSortFields = ['createdAt', 'action', 'entityType', 'logId'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy = { [orderField]: sortOrder };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              fullName: true,
              role: true,
              email: true,
              profileImage: true,
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

  /**
   * Get single audit log with computed diff
   */
  async getAuditLogById(logId: number) {
    const log = await prisma.auditLog.findUnique({
      where: { logId },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            role: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    if (!log) {
      return null;
    }

    const oldVals = (log.oldValues && typeof log.oldValues === 'object' ? log.oldValues : {}) as Record<string, any>;
    const newVals = (log.newValues && typeof log.newValues === 'object' ? log.newValues : {}) as Record<string, any>;

    const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));
    const diff = allKeys.map((key) => {
      const oldVal = oldVals[key];
      const newVal = newVals[key];
      const isAdded = !(key in oldVals) && key in newVals;
      const isRemoved = key in oldVals && !(key in newVals);
      const isModified = !isAdded && !isRemoved && JSON.stringify(oldVal) !== JSON.stringify(newVal);
      return {
        key,
        oldValue: oldVal,
        newValue: newVal,
        status: isAdded ? 'added' : isRemoved ? 'removed' : isModified ? 'modified' : 'unchanged',
      };
    });

    return {
      ...log,
      diff,
    };
  }

  /**
   * Get dynamic filter options (actions, entity types, users)
   */
  async getAuditFilterOptions() {
    const [actionsResult, entityTypesResult, usersResult] = await Promise.all([
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
      prisma.auditLog.findMany({
        where: { entityType: { not: null } },
        select: { entityType: true },
        distinct: ['entityType'],
        orderBy: { entityType: 'asc' },
      }),
      prisma.user.findMany({
        select: {
          userId: true,
          username: true,
          fullName: true,
          role: true,
        },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    return {
      actions: actionsResult.map((a) => a.action).filter(Boolean),
      entityTypes: entityTypesResult.map((e) => e.entityType).filter(Boolean) as string[],
      users: usersResult,
    };
  }

  /**
   * Get audit statistics and activity trends
   */
  async getAuditStats(filters?: { dateFrom?: Date; dateTo?: Date }) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [totalLogs, todayLogs, topActionsRaw, topUsersRaw, recentLogsForTimeline] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 6,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...where, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
      prisma.auditLog.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Fetch user details for top users
    const userIds = topUsersRaw.map((u) => u.userId).filter((id): id is number => id !== null);
    const users = await prisma.user.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, username: true, fullName: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.userId, u]));

    const topUsers = topUsersRaw.map((item) => {
      const u = item.userId ? userMap.get(item.userId) : null;
      return {
        userId: item.userId,
        username: u?.username || 'Unknown',
        fullName: u?.fullName || 'Unknown',
        role: u?.role || 'N/A',
        count: item._count.userId,
      };
    });

    const topActions = topActionsRaw.map((a) => ({
      action: a.action,
      count: a._count.action,
    }));

    // Build timeline by day (last 7 days)
    const timelineMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      timelineMap[key] = 0;
    }
    for (const log of recentLogsForTimeline) {
      const key = log.createdAt.toISOString().split('T')[0];
      if (timelineMap[key] !== undefined) {
        timelineMap[key]++;
      }
    }
    const timeline = Object.entries(timelineMap).map(([date, count]) => ({ date, count }));

    return {
      totalLogs,
      todayLogs,
      topActions,
      topUsers,
      timeline,
    };
  }

  /**
   * Export audit logs to CSV string format
   */
  async exportAuditLogs(filters: {
    userId?: number;
    entityType?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  }): Promise<string> {
    const { data: logs } = await this.getAuditLogs({
      ...filters,
      page: 1,
      limit: 5000, // Export up to 5000 rows
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Log ID',
      'Timestamp (UTC)',
      'User ID',
      'Username',
      'Full Name',
      'Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'User Agent',
      'Old Values',
      'New Values',
    ];

    const rows = logs.map((log) => [
      escapeCsv(log.logId),
      escapeCsv(log.createdAt.toISOString()),
      escapeCsv(log.userId),
      escapeCsv(log.user?.username || 'System'),
      escapeCsv(log.user?.fullName || 'N/A'),
      escapeCsv(log.user?.role || 'SYSTEM'),
      escapeCsv(log.action),
      escapeCsv(log.entityType || ''),
      escapeCsv(log.entityId || ''),
      escapeCsv(log.ipAddress || ''),
      escapeCsv(log.userAgent || ''),
      escapeCsv(log.oldValues ? JSON.stringify(log.oldValues) : ''),
      escapeCsv(log.newValues ? JSON.stringify(log.newValues) : ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const auditLogService = new AuditLogService();