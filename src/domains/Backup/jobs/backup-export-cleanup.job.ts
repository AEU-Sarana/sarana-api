import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { buildS3Client, deleteObject } from '../utils/s3.util';
import { logger } from '@src/shared/utils/logger';

const BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || process.env.R2_BUCKET_NAME?.replace(/['"]/g, '') || 'stock-pos-storage';
const EXPORT_PREFIX = 'exports/';
const EXPORT_TTL_HOURS = Number(process.env.BACKUP_EXPORT_TTL_HOURS || 24);
const EXPORT_CLEANUP_INTERVAL_MS = Number(
  process.env.BACKUP_EXPORT_CLEANUP_INTERVAL_MS || 60 * 60 * 1000
);

let exportCleanupTimer: NodeJS.Timeout | null = null;

export async function runBackupExportCleanupJob(): Promise<void> {
  const s3 = buildS3Client();
  const cutoff = Date.now() - EXPORT_TTL_HOURS * 60 * 60 * 1000;

  let continuationToken: string | undefined;
  let deletedCount = 0;

  try {
    do {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: EXPORT_PREFIX,
          ContinuationToken: continuationToken,
        })
      );

      for (const object of response.Contents ?? []) {
        if (!object.Key || !object.LastModified) continue;
        if (object.LastModified.getTime() > cutoff) continue;

        await deleteObject(s3, BUCKET, object.Key);
        deletedCount += 1;
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    logger.info('Backup export cleanup completed', {
      deletedCount,
      ttlHours: EXPORT_TTL_HOURS,
    });
  } catch (error: any) {
    logger.error('Backup export cleanup failed', {
      error: error.message,
    });
    throw error;
  }
}

export function startBackupExportCleanupJob(): void {
  if (exportCleanupTimer) return;

  // Run once on startup
  void runBackupExportCleanupJob().catch((error) => {
    logger.error('Backup export cleanup initial run failed', { error: error.message });
  });

  exportCleanupTimer = setInterval(() => {
    void runBackupExportCleanupJob().catch((error) => {
      logger.error('Backup export cleanup scheduled run failed', { error: error.message });
    });
  }, EXPORT_CLEANUP_INTERVAL_MS);

  logger.info('Backup export cleanup scheduler started', {
    intervalMs: EXPORT_CLEANUP_INTERVAL_MS,
    ttlHours: EXPORT_TTL_HOURS,
  });
}

export function stopBackupExportCleanupJob(): void {
  if (!exportCleanupTimer) return;
  clearInterval(exportCleanupTimer);
  exportCleanupTimer = null;
  logger.info('Backup export cleanup scheduler stopped');
}
