"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupController = void 0;
const backup_service_1 = require("../../../../domains/Backup/services/backup.service");
const logger_1 = require("../../../../shared/utils/logger");
class BackupController {
    /**
     * GET /api/v1/backup/list
     */
    static async listBackups(req, res) {
        try {
            const request = {
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
            };
            const response = await backup_service_1.BackupService.listBackups(request.page, request.limit);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Backups retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('List backups error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/backup/create
     */
    static async createBackup(req, res) {
        try {
            const request = req.body;
            const response = await backup_service_1.BackupService.createBackup(request);
            res.status(201).json({
                success: true,
                data: response,
                message: 'Backup created',
            });
        }
        catch (error) {
            logger_1.logger.error('Create backup error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/backup/restore
     */
    static async restoreBackup(req, res) {
        try {
            const request = req.body;
            const response = await backup_service_1.BackupService.restoreBackup(request);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Backup restored',
            });
        }
        catch (error) {
            logger_1.logger.error('Restore backup error', { error: error.message });
            throw error;
        }
    }
    /**
     * GET /api/v1/backup/export
     */
    static async exportData(req, res) {
        try {
            const format = (req.query.format || '').toUpperCase();
            const table = req.query.table;
            const response = await backup_service_1.BackupService.exportData(format, table, req.query);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Data exported',
            });
        }
        catch (error) {
            logger_1.logger.error('Export backup data error', { error: error.message });
            throw error;
        }
    }
    /**
     * GET /api/v1/backup/download/:id
     */
    static async downloadBackup(req, res) {
        try {
            const rawParam = req.params.id;
            const paramStr = Array.isArray(rawParam) ? rawParam[0] : rawParam;
            const rawQuery = req.query.id;
            const queryStr = Array.isArray(rawQuery) ? String(rawQuery[0]) : (rawQuery ? String(rawQuery) : '');
            const backupId = parseInt(paramStr || queryStr, 10);
            if (!backupId || isNaN(backupId)) {
                res.status(400).json({ success: false, message: 'Invalid backup ID' });
                return;
            }
            const { filePath, fileName } = await backup_service_1.BackupService.downloadBackup(backupId);
            res.download(filePath, fileName, (err) => {
                if (err) {
                    logger_1.logger.error('Error sending download backup file', { error: err.message });
                }
                try {
                    const fs = require('fs');
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
                catch { }
            });
        }
        catch (error) {
            logger_1.logger.error('Download backup error', { error: error.message });
            res.status(400).json({ success: false, message: error.message || 'Download backup failed' });
        }
    }
}
exports.BackupController = BackupController;
//# sourceMappingURL=backup.controller.js.map