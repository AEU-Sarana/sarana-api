import { BackupRunStatus, BackupRunType } from '@src/domains/Backup/enums';

export interface BackupCreatedEvent {
  backup_id: number;
  backup_name: string;
  file_size: number;
  created_at: Date;
  run_type: BackupRunType.MANUAL | BackupRunType.AUTO;
  status: BackupRunStatus.SUCCESS;
}
