import { Client } from 'pg';
import { buildS3Client, deleteObject } from '../utils/s3.util';
import { logger } from '@src/shared/utils/logger';

const BUCKET = process.env.S3_BUCKET || 'stock-pos-storage';
const MAX_BACKUPS = Number(process.env.MAX_BACKUPS || 7);
const RETENTION_CLEANUP_INTERVAL_MS = Number(
  process.env.BACKUP_RETENTION_CLEANUP_INTERVAL_MS || 6 * 60 * 60 * 1000
);

let retentionCleanupTimer: NodeJS.Timeout | null = null;

export async function runBackupRetentionCleanupJob(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || '';
  const client = new Client({ connectionString: dbUrl });
  const s3 = buildS3Client();
  await client.connect();

  try {
    const backupsRes = await client.query(
      `SELECT backup_id, object_key
       FROM backups
       ORDER BY created_at DESC`
    );

    const overflowRows = backupsRes.rows.slice(MAX_BACKUPS);
    if (!overflowRows.length) {
      logger.info('Backup retention cleanup completed with no overflow', {
        maxBackups: MAX_BACKUPS,
      });
      return;
    }

    for (const row of overflowRows) {
      if (row.object_key) {
        await deleteObject(s3, BUCKET, row.object_key);
      }

      await client.query('DELETE FROM backups WHERE backup_id = $1', [row.backup_id]);
      await client.query(
        `UPDATE backup_runs
         SET retention_policy_applied = TRUE
         WHERE object_key = $1`,
        [row.object_key]
      );
    }

    logger.info('Backup retention cleanup completed', {
      removedCount: overflowRows.length,
      maxBackups: MAX_BACKUPS,
    });
  } catch (error: any) {
    if (error.message?.includes('relation "backups" does not exist')) {
      logger.warn('Backup retention cleanup skipped: backups table does not exist yet');
      return;
    }

    logger.error('Backup retention cleanup failed', {
      error: error.message,
    });
    throw error;
  } finally {
    await client.end();
  }
}

export function startBackupRetentionCleanupJob(): void {
  if (retentionCleanupTimer) return;

  // Run once on startup
  void runBackupRetentionCleanupJob();

  retentionCleanupTimer = setInterval(() => {
    void runBackupRetentionCleanupJob();
  }, RETENTION_CLEANUP_INTERVAL_MS);

  logger.info('Backup retention cleanup scheduler started', {
    intervalMs: RETENTION_CLEANUP_INTERVAL_MS,
    maxBackups: MAX_BACKUPS,
  });
}

export function stopBackupRetentionCleanupJob(): void {
  if (!retentionCleanupTimer) return;
  clearInterval(retentionCleanupTimer);
  retentionCleanupTimer = null;
  logger.info('Backup retention cleanup scheduler stopped');
}
