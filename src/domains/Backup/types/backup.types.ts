export interface CreateBackupRequest {
  backup_name: string;
  include_data: boolean;
}

export interface CreateBackupResponse {
  backup_id: number;
  backup_name: string;
  file_path: string;
  file_size: number;
  created_at: Date;
}
