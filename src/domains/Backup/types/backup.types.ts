export interface CreateBackupRequest {
  backup_name: string;
  include_data: boolean;
  triggered_by?: string;
}

export interface CreateBackupResponse {
  backup_id: number;
  backup_name: string;
  file_path: string;
  file_size: number;
  created_at: Date;
}

export interface ListBackupsRequest {
  page: number;
  limit: number;
}

export interface BackupListItem {
  backup_id: number;
  backup_name: string;
  file_size: number;
  created_at: Date;
}

export interface ListBackupsResponse {
  backups: BackupListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RestoreBackupRequest {
  backup_id: number;
}

export interface RestoreBackupResponse {
  restored: boolean;
  restored_at: Date;
}

export interface ExportResponse {
  file_url: string;
  file_name: string;
  expires_at: string;
}

export type ExportFormat = 'CSV' | 'PDF';
