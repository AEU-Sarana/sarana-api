import { Request, Response } from 'express';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { logger } from '@src/shared/utils/logger';

export class AuditController {
  /**
   * GET /api/v1/audit-logs
   * List audit logs with pagination and filters
   */
  static async listLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const search = req.query.search as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

      const result = await auditLogService.getAuditLogs({
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
    } catch (error: any) {
      logger.error('List audit logs error:', { error: error.message });
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
  static async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const options = await auditLogService.getAuditFilterOptions();
      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error: any) {
      logger.error('Get audit filter options error:', { error: error.message });
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
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await auditLogService.getAuditStats({ dateFrom, dateTo });
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get audit stats error:', { error: error.message });
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
  static async exportLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const search = req.query.search as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const csv = await auditLogService.exportAuditLogs({
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
    } catch (error: any) {
      logger.error('Export audit logs error:', { error: error.message });
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
  static async getLogDetails(req: Request, res: Response): Promise<void> {
    try {
      const logId = parseInt(req.params.id as string, 10);
      const log = await auditLogService.getAuditLogById(logId);

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
    } catch (error: any) {
      logger.error('Get audit log detail error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit log details',
        error: error.message,
      });
    }
  }
}
