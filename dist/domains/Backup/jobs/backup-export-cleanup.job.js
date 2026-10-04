"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBackupExportCleanupJob = runBackupExportCleanupJob;
exports.startBackupExportCleanupJob = startBackupExportCleanupJob;
exports.stopBackupExportCleanupJob = stopBackupExportCleanupJob;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_util_1 = require("../utils/s3.util");
const logger_1 = require("../../../shared/utils/logger");
const BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || process.env.R2_BUCKET_NAME?.replace(/['"]/g, '') || 'stock-pos-storage';
const EXPORT_PREFIX = 'exports/';
const EXPORT_TTL_HOURS = Number(process.env.BACKUP_EXPORT_TTL_HOURS || 24);
const EXPORT_CLEANUP_INTERVAL_MS = Number(process.env.BACKUP_EXPORT_CLEANUP_INTERVAL_MS || 60 * 60 * 1000);
let exportCleanupTimer = null;
async function runBackupExportCleanupJob() {
    const s3 = (0, s3_util_1.buildS3Client)();
    const cutoff = Date.now() - EXPORT_TTL_HOURS * 60 * 60 * 1000;
    let continuationToken;
    let deletedCount = 0;
    try {
        do {
            const response = await s3.send(new client_s3_1.ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: EXPORT_PREFIX,
                ContinuationToken: continuationToken,
            }));
            for (const object of response.Contents ?? []) {
                if (!object.Key || !object.LastModified)
                    continue;
                if (object.LastModified.getTime() > cutoff)
                    continue;
                await (0, s3_util_1.deleteObject)(s3, BUCKET, object.Key);
                deletedCount += 1;
            }
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);
        logger_1.logger.info('Backup export cleanup completed', {
            deletedCount,
            ttlHours: EXPORT_TTL_HOURS,
        });
    }
    catch (error) {
        logger_1.logger.error('Backup export cleanup failed', {
            error: error.message,
        });
        throw error;
    }
}
function startBackupExportCleanupJob() {
    if (exportCleanupTimer)
        return;
    // Run once on startup
    void runBackupExportCleanupJob().catch((error) => {
        logger_1.logger.error('Backup export cleanup initial run failed', { error: error.message });
    });
    exportCleanupTimer = setInterval(() => {
        void runBackupExportCleanupJob().catch((error) => {
            logger_1.logger.error('Backup export cleanup scheduled run failed', { error: error.message });
        });
    }, EXPORT_CLEANUP_INTERVAL_MS);
    logger_1.logger.info('Backup export cleanup scheduler started', {
        intervalMs: EXPORT_CLEANUP_INTERVAL_MS,
        ttlHours: EXPORT_TTL_HOURS,
    });
}
function stopBackupExportCleanupJob() {
    if (!exportCleanupTimer)
        return;
    clearInterval(exportCleanupTimer);
    exportCleanupTimer = null;
    logger_1.logger.info('Backup export cleanup scheduler stopped');
}
//# sourceMappingURL=backup-export-cleanup.job.js.map