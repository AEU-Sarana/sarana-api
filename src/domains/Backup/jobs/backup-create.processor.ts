import { Job } from 'bull';
import { BackupService } from '@src/domains/Backup/services/backup.service';
import { logger } from '@src/shared/utils/logger';

export interface BackupCreateJobPayload {
  backup_name?: string;
  include_data?: boolean;
  triggered_by?: string;
}

export async function processBackupCreateProcessor(
  job: Job<BackupCreateJobPayload>
) {
  const payload = job.data || {};
  const backupName = payload.backup_name || `backup_${new Date().toISOString().slice(0, 10)}`;
  const includeData = payload.include_data ?? true;

  logger.info('Processing backup create job', {
    jobId: job.id,
    backupName,
    includeData,
  });

  return BackupService.createBackup({
    backup_name: backupName,
    include_data: includeData,
    triggered_by: payload.triggered_by || 'manual',
  });
}
