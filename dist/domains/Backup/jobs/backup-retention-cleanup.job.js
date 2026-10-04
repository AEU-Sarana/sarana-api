"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBackupRetentionCleanupJob = runBackupRetentionCleanupJob;
exports.startBackupRetentionCleanupJob = startBackupRetentionCleanupJob;
exports.stopBackupRetentionCleanupJob = stopBackupRetentionCleanupJob;
const pg_1 = require("pg");
const s3_util_1 = require("../utils/s3.util");
const logger_1 = require("../../../shared/utils/logger");
const BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || process.env.R2_BUCKET_NAME?.replace(/['"]/g, '') || 'stock-pos-storage';
const MAX_BACKUPS = Number(process.env.MAX_BACKUPS || 7);
const RETENTION_CLEANUP_INTERVAL_MS = Number(process.env.BACKUP_RETENTION_CLEANUP_INTERVAL_MS || 6 * 60 * 60 * 1000);
let retentionCleanupTimer = null;
async function runBackupRetentionCleanupJob() {
    const dbUrl = process.env.DATABASE_URL || '';
    const client = new pg_1.Client({ connectionString: dbUrl });
    const s3 = (0, s3_util_1.buildS3Client)();
    await client.connect();
    try {
        const backupsRes = await client.query(`SELECT backup_id, object_key
       FROM backups
       ORDER BY created_at DESC`);
        const overflowRows = backupsRes.rows.slice(MAX_BACKUPS);
        if (!overflowRows.length) {
            logger_1.logger.info('Backup retention cleanup completed with no overflow', {
                maxBackups: MAX_BACKUPS,
            });
            return;
        }
        for (const row of overflowRows) {
            if (row.object_key) {
                await (0, s3_util_1.deleteObject)(s3, BUCKET, row.object_key);
            }
            await client.query('DELETE FROM backups WHERE backup_id = $1', [row.backup_id]);
            await client.query(`UPDATE backup_runs
         SET retention_policy_applied = TRUE
         WHERE object_key = $1`, [row.object_key]);
        }
        logger_1.logger.info('Backup retention cleanup completed', {
            removedCount: overflowRows.length,
            maxBackups: MAX_BACKUPS,
        });
    }
    catch (error) {
        if (error.message?.includes('relation "backups" does not exist')) {
            logger_1.logger.warn('Backup retention cleanup skipped: backups table does not exist yet');
            return;
        }
        logger_1.logger.error('Backup retention cleanup failed', {
            error: error.message,
        });
        throw error;
    }
    finally {
        await client.end();
    }
}
function startBackupRetentionCleanupJob() {
    if (retentionCleanupTimer)
        return;
    // Run once on startup
    void runBackupRetentionCleanupJob().catch((error) => {
        logger_1.logger.error('Backup retention cleanup initial run failed', { error: error.message });
    });
    retentionCleanupTimer = setInterval(() => {
        void runBackupRetentionCleanupJob().catch((error) => {
            logger_1.logger.error('Backup retention cleanup scheduled run failed', { error: error.message });
        });
    }, RETENTION_CLEANUP_INTERVAL_MS);
    logger_1.logger.info('Backup retention cleanup scheduler started', {
        intervalMs: RETENTION_CLEANUP_INTERVAL_MS,
        maxBackups: MAX_BACKUPS,
    });
}
function stopBackupRetentionCleanupJob() {
    if (!retentionCleanupTimer)
        return;
    clearInterval(retentionCleanupTimer);
    retentionCleanupTimer = null;
    logger_1.logger.info('Backup retention cleanup scheduler stopped');
}
//# sourceMappingURL=backup-retention-cleanup.job.js.map