import { BackupRunStatus, BackupRunType } from '@src/domains/Backup/enums';

export interface BackupRestoredEvent {
  backup_id: number;
  restored_at: Date;
  run_type: BackupRunType.RESTORE;
  status: BackupRunStatus.SUCCESS;
}
