"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const audit_log_service_1 = require("../../../../shared/services/audit-log.service");
const logger_1 = require("../../../../shared/utils/logger");
class AuditController {
    /**
     * GET /api/v1/audit-logs
     * List audit logs with pagination and filters
     */
    static async listLogs(req, res) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 15;
            const userId = req.query.userId ? parseInt(req.query.userId, 10) : undefined;
            const action = req.query.action;
            const entityType = req.query.entityType;
            const search = req.query.search;
            const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
            const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;
            const sortBy = req.query.sortBy;
            const sortOrder = req.query.sortOrder;
            const result = await audit_log_service_1.auditLogService.getAuditLogs({
                page,
                limit,
                userId,
                action,
                entityType,
                search,
                dateFrom,
                dateTo,
                sortBy,
                sortOrder,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: result.pagination,
                message: 'Audit logs retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('List audit logs error:', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve audit logs',
                error: error.message,
            });
        }
    }
    /**
     * GET /api/v1/audit-logs/filters
     * Get dynamic filter dropdown options
     */
    static async getFilterOptions(req, res) {
        try {
            const options = await audit_log_service_1.auditLogService.getAuditFilterOptions();
            res.status(200).json({
                success: true,
                data: options,
            });
        }
        catch (error) {
            logger_1.logger.error('Get audit filter options error:', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve audit filter options',
                error: error.message,
            });
        }
    }
    /**
     * GET /api/v1/audit-logs/stats
     * Get analytics overview and trends
     */
    static async getStats(req, res) {
        try {
            const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
            const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;
            const stats = await audit_log_service_1.auditLogService.getAuditStats({ dateFrom, dateTo });
            res.status(200).json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            logger_1.logger.error('Get audit stats error:', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve audit statistics',
                error: error.message,
            });
        }
    }
    /**
     * GET /api/v1/audit-logs/export
     * Export audit logs to CSV
     */
    static async exportLogs(req, res) {
        try {
            const userId = req.query.userId ? parseInt(req.query.userId, 10) : undefined;
            const action = req.query.action;
            const entityType = req.query.entityType;
            const search = req.query.search;
            const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
            const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;
            const csv = await audit_log_service_1.auditLogService.exportAuditLogs({
                userId,
                action,
                entityType,
                search,
                dateFrom,
                dateTo,
            });
            const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).send(csv);
        }
        catch (error) {
            logger_1.logger.error('Export audit logs error:', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to export audit logs',
                error: error.message,
            });
        }
    }
    /**
     * GET /api/v1/audit-logs/:id
     * Get single audit log detail with diff
     */
    static async getLogDetails(req, res) {
        try {
            const logId = parseInt(req.params.id, 10);
            const log = await audit_log_service_1.auditLogService.getAuditLogById(logId);
            if (!log) {
                res.status(404).json({
                    success: false,
                    message: `Audit log with ID #${logId} not found`,
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: log,
            });
        }
        catch (error) {
            logger_1.logger.error('Get audit log detail error:', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve audit log details',
                error: error.message,
            });
        }
    }
}
exports.AuditController = AuditController;
//# sourceMappingURL=audit.controller.js.map