import { BackupRunStatus, BackupRunType } from '@src/domains/Backup/enums';

export interface BackupFailedEvent {
  run_type: BackupRunType;
  status: BackupRunStatus.FAILED;
  error_code: string;
  error_message: string;
  occurred_at: Date;
}
