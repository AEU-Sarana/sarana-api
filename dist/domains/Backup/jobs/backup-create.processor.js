"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBackupCreateProcessor = processBackupCreateProcessor;
const backup_service_1 = require("../../../domains/Backup/services/backup.service");
const logger_1 = require("../../../shared/utils/logger");
async function processBackupCreateProcessor(job) {
    const payload = job.data || {};
    const backupName = payload.backup_name || `backup_${new Date().toISOString().slice(0, 10)}`;
    const includeData = payload.include_data ?? true;
    logger_1.logger.info('Processing backup create job', {
        jobId: job.id,
        backupName,
        includeData,
    });
    return backup_service_1.BackupService.createBackup({
        backup_name: backupName,
        include_data: includeData,
        triggered_by: payload.triggered_by || 'manual',
    });
}
//# sourceMappingURL=backup-create.processor.js.map