import { Job } from 'bull';
import { BackupService } from '@src/domains/Backup/services/backup.service';
import { logger } from '@src/shared/utils/logger';

export interface BackupRestoreJobPayload {
  backup_id: number;
}

export async function processBackupRestoreProcessor(
  job: Job<BackupRestoreJobPayload>
) {
  const { backup_id } = job.data;

  logger.info('Processing backup restore job', {
    jobId: job.id,
    backupId: backup_id,
  });

  return BackupService.restoreBackup({ backup_id });
}
