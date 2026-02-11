import { BackupExportFormat, BackupRunStatus } from '@src/domains/Backup/enums';

export interface BackupExportedEvent {
  table: string;
  format: BackupExportFormat;
  file_name: string;
  file_url: string;
  expires_at: string;
  status: BackupRunStatus.SUCCESS;
}
