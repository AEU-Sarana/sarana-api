"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBackupRestoreProcessor = processBackupRestoreProcessor;
const backup_service_1 = require("../../../domains/Backup/services/backup.service");
const logger_1 = require("../../../shared/utils/logger");
async function processBackupRestoreProcessor(job) {
    const { backup_id } = job.data;
    logger_1.logger.info('Processing backup restore job', {
        jobId: job.id,
        backupId: backup_id,
    });
    return backup_service_1.BackupService.restoreBackup({ backup_id });
}
//# sourceMappingURL=backup-restore.processor.js.map