"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogService = exports.AuditLogService = void 0;
const database_1 = require("../../shared/config/database");
const logger_1 = require("../../shared/utils/logger");
function extractAuditValues(data) {
    let oldValues = data.oldValues;
    let newValues = data.newValues;
    if (!oldValues && !newValues && data.details) {
        const d = data.details;
        if ('stockBefore' in d || 'stockAfter' in d) {
            oldValues = {
                stockQuantity: d.stockBefore ?? null,
            };
            newValues = {
                stockQuantity: d.stockAfter ?? null,
                ...(d.quantity !== undefined ? { quantityChange: d.quantity } : {}),
                ...(d.cost !== undefined ? { unitCost: typeof d.cost === 'number' ? `$${d.cost.toFixed(2)}` : d.cost } : {}),
                ...(d.supplier ? { supplier: d.supplier } : {}),
                ...(d.reason ? { reason: d.reason } : {}),
            };
        }
        else if ('fromStatus' in d || 'toStatus' in d) {
            oldValues = { status: d.fromStatus ?? null };
            newValues = { status: d.toStatus ?? null };
        }
        else if ('before' in d || 'after' in d) {
            oldValues = d.before || null;
            newValues = d.after || null;
        }
        else {
            newValues = d;
        }
    }
    return { oldValues, newValues };
}
class AuditLogService {
    /**
     * Create audit log entry
     */
    async createAuditLog(data) {
        const { oldValues, newValues } = extractAuditValues(data);
        try {
            await database_1.prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action: data.action,
                    entityType: data.entityType ?? data.resource,
                    entityId: data.entityId,
                    oldValues: oldValues,
                    newValues: newValues,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                },
            });
        }
        catch (error) {
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
                logger_1.logger.warn(`Invalid user ID ${data.userId} for audit log, retrying without user reference`);
                try {
                    // Retry without userId
                    await database_1.prisma.auditLog.create({
                        data: {
                            userId: undefined,
                            action: data.action,
                            entityType: data.entityType ?? data.resource,
                            entityId: data.entityId,
                            oldValues: oldValues,
                            newValues: newValues,
                            ipAddress: data.ipAddress,
                            userAgent: data.userAgent,
                        },
                    });
                }
                catch (retryError) {
                    logger_1.logger.error('Failed to create audit log (retry without userId):', retryError);
                }
            }
            else {
                // Log other errors but don't throw (audit logging should not break main flow)
                logger_1.logger.error('Failed to create audit log:', error);
            }
        }
    }
    /**
     * Get audit logs with rich filters, search, and sorting
     */
    async getAuditLogs(filters) {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', ...whereFilters } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (whereFilters.userId)
            where.userId = whereFilters.userId;
        if (whereFilters.entityType)
            where.entityType = whereFilters.entityType;
        if (whereFilters.action)
            where.action = whereFilters.action;
        if (whereFilters.dateFrom || whereFilters.dateTo) {
            where.createdAt = {};
            if (whereFilters.dateFrom)
                where.createdAt.gte = whereFilters.dateFrom;
            if (whereFilters.dateTo)
                where.createdAt.lte = whereFilters.dateTo;
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
            database_1.prisma.auditLog.findMany({
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
            database_1.prisma.auditLog.count({ where }),
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
    async getAuditLogById(logId) {
        const log = await database_1.prisma.auditLog.findUnique({
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
        let oldVals = (log.oldValues && typeof log.oldValues === 'object' ? log.oldValues : null);
        let newVals = (log.newValues && typeof log.newValues === 'object' ? log.newValues : null);
        // Fallback: If both oldValues and newValues are null (e.g. historical logs before mapping was introduced)
        if (!oldVals && !newVals) {
            if ((log.entityType === 'Stock' || log.action?.includes('STOCK')) && log.entityId) {
                try {
                    const stock = await database_1.prisma.stock.findUnique({
                        where: { stockId: log.entityId },
                        include: { product: true },
                    });
                    if (stock) {
                        // Find stock movement recorded around the same time (+- 5 minutes)
                        const logTime = new Date(log.createdAt);
                        const movement = await database_1.prisma.stockMovement.findFirst({
                            where: {
                                productId: stock.productId,
                                createdAt: {
                                    gte: new Date(logTime.getTime() - 300000),
                                    lte: new Date(logTime.getTime() + 300000),
                                },
                            },
                            orderBy: { createdAt: 'desc' },
                        });
                        if (movement) {
                            const qty = movement.quantity;
                            if (log.action === 'STOCK_IN') {
                                const estOld = Math.max(0, stock.quantity - qty);
                                oldVals = {
                                    productName: stock.product?.productName,
                                    stockQuantity: estOld,
                                };
                                newVals = {
                                    productName: stock.product?.productName,
                                    stockQuantity: estOld + qty,
                                    quantityAdded: qty,
                                    ...(movement.cost ? { unitCost: `$${Number(movement.cost).toFixed(2)}` } : {}),
                                    ...(movement.supplier ? { supplier: movement.supplier } : {}),
                                };
                            }
                            else if (log.action === 'STOCK_ADJUSTMENT') {
                                oldVals = {
                                    productName: stock.product?.productName,
                                    stockQuantity: stock.quantity - qty,
                                };
                                newVals = {
                                    productName: stock.product?.productName,
                                    stockQuantity: stock.quantity,
                                    quantityAdjusted: qty,
                                    ...(movement.reason ? { reason: movement.reason } : {}),
                                };
                            }
                            else {
                                newVals = {
                                    productName: stock.product?.productName,
                                    quantity: qty,
                                    movementType: movement.movementType,
                                    ...(movement.supplier ? { supplier: movement.supplier } : {}),
                                };
                            }
                        }
                        else {
                            newVals = {
                                productName: stock.product?.productName,
                                currentStock: stock.quantity,
                                barcode: stock.product?.barcode,
                            };
                        }
                    }
                }
                catch (fallbackErr) {
                    logger_1.logger.warn('Failed to fallback Stock audit diff:', fallbackErr);
                }
            }
            else if (log.entityType === 'PurchaseOrder' && log.entityId) {
                try {
                    const po = await database_1.prisma.purchaseOrder.findUnique({
                        where: { poId: log.entityId },
                        include: { supplier: true },
                    });
                    if (po) {
                        newVals = {
                            poNumber: po.poNumber,
                            supplier: po.supplier?.companyName,
                            totalAmount: `$${Number(po.totalAmount).toFixed(2)}`,
                            status: po.status,
                        };
                    }
                }
                catch (e) { }
            }
            else if (log.entityType === 'Order' && log.entityId) {
                try {
                    const order = await database_1.prisma.order.findUnique({
                        where: { orderId: log.entityId },
                    });
                    if (order) {
                        newVals = {
                            orderNumber: order.receiptNumber,
                            totalAmount: `$${Number(order.totalAmount).toFixed(2)}`,
                            paymentStatus: order.paymentStatus,
                        };
                    }
                }
                catch (e) { }
            }
        }
        const safeOld = oldVals || {};
        const safeNew = newVals || {};
        const allKeys = Array.from(new Set([...Object.keys(safeOld), ...Object.keys(safeNew)]));
        const diff = allKeys.map((key) => {
            const oldVal = safeOld[key];
            const newVal = safeNew[key];
            const isAdded = !(key in safeOld) && key in safeNew;
            const isRemoved = key in safeOld && !(key in safeNew);
            const isModified = !isAdded && !isRemoved && JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return {
                key,
                oldValue: oldVal ?? null,
                newValue: newVal ?? null,
                status: isAdded ? 'added' : isRemoved ? 'removed' : isModified ? 'modified' : 'unchanged',
            };
        });
        return {
            ...log,
            oldValues: oldVals,
            newValues: newVals,
            diff,
        };
    }
    /**
     * Get dynamic filter options (actions, entity types, users)
     */
    async getAuditFilterOptions() {
        const [actionsResult, entityTypesResult, usersResult] = await Promise.all([
            database_1.prisma.auditLog.findMany({
                select: { action: true },
                distinct: ['action'],
                orderBy: { action: 'asc' },
            }),
            database_1.prisma.auditLog.findMany({
                where: { entityType: { not: null } },
                select: { entityType: true },
                distinct: ['entityType'],
                orderBy: { entityType: 'asc' },
            }),
            database_1.prisma.user.findMany({
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
            entityTypes: entityTypesResult.map((e) => e.entityType).filter(Boolean),
            users: usersResult,
        };
    }
    /**
     * Get audit statistics and activity trends
     */
    async getAuditStats(filters) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const where = {};
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom)
                where.createdAt.gte = filters.dateFrom;
            if (filters.dateTo)
                where.createdAt.lte = filters.dateTo;
        }
        const [totalLogs, todayLogs, topActionsRaw, topUsersRaw, recentLogsForTimeline] = await Promise.all([
            database_1.prisma.auditLog.count({ where }),
            database_1.prisma.auditLog.count({
                where: {
                    ...where,
                    createdAt: { gte: startOfToday },
                },
            }),
            database_1.prisma.auditLog.groupBy({
                by: ['action'],
                where,
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 6,
            }),
            database_1.prisma.auditLog.groupBy({
                by: ['userId'],
                where: { ...where, userId: { not: null } },
                _count: { userId: true },
                orderBy: { _count: { userId: 'desc' } },
                take: 5,
            }),
            database_1.prisma.auditLog.findMany({
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
        const userIds = topUsersRaw.map((u) => u.userId).filter((id) => id !== null);
        const users = await database_1.prisma.user.findMany({
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
        const timelineMap = {};
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
    async exportAuditLogs(filters) {
        const { data: logs } = await this.getAuditLogs({
            ...filters,
            page: 1,
            limit: 5000, // Export up to 5000 rows
            sortBy: 'createdAt',
            sortOrder: 'desc',
        });
        const escapeCsv = (val) => {
            if (val === null || val === undefined)
                return '""';
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
exports.AuditLogService = AuditLogService;
exports.auditLogService = new AuditLogService();
//# sourceMappingURL=audit-log.service.js.map