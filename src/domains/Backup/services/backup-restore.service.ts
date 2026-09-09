// File: src/domains/Backup/services/backup-restore.service.ts

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { Client } from 'pg';
import { buildS3Client, getObjectToFile } from '../utils/s3.util';
import { decryptFile } from '../utils/crypto.util';
import { RestoreBackupRequest, RestoreBackupResponse } from '../types/backup.types';

const RESTORE_LOCK_KEY = 9235002;
const BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || process.env.R2_BUCKET_NAME?.replace(/['"]/g, '') || 'stock-pos-storage';

export class BackupRestoreService {
  static async restoreBackup(input: RestoreBackupRequest): Promise<RestoreBackupResponse> {
    const dbUrl = process.env.DATABASE_URL || '';
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [RESTORE_LOCK_KEY]);
      if (!lockRes.rows[0]?.locked) {
        const err = new Error('Restore already running');
        (err as any).code = 'BACKUP_CONFLICT';
        throw err;
      }

      const meta = await client.query(
        'SELECT backup_id, backup_name, object_key, checksum FROM backups WHERE backup_id = $1 AND status = $2',
        [input.backup_id, 'success']
      );
      if (meta.rows.length === 0) {
        const err = new Error('Backup not found');
        (err as any).code = 'BACKUP_NOT_FOUND';
        throw err;
      }

      const objectKey = meta.rows[0].object_key;
      const backupName = meta.rows[0].backup_name as string;
      const checksum = meta.rows[0].checksum as string;
      const encPath = path.join('/tmp', `restore_${input.backup_id}.sql.enc`);
      const sqlPath = path.join('/tmp', `restore_${input.backup_id}.sql`);

      const s3 = buildS3Client();
      await getObjectToFile(s3, BUCKET, objectKey, encPath);
      await decryptFile(encPath, sqlPath, process.env.BACKUP_ENCRYPTION_KEY || '');
      await this.sanitizeSqlDumpForCompatibility(sqlPath);

      await new Promise<void>((resolve, reject) => {
        let restoreError = '';
        const proc = spawn('psql', [
          `--dbname=${dbUrl}`,
          '-v',
          'ON_ERROR_STOP=1',
          '--file',
          sqlPath,
        ]);
        proc.stderr.on('data', (d) => {
          const msg = d.toString();
          restoreError += msg;
          process.stderr.write(d);
        });
        proc.on('error', reject);
        proc.on('close', (code) =>
          code === 0
            ? resolve()
            : reject(new Error(restoreError ? `psql restore failed: ${restoreError.trim()}` : 'psql restore failed'))
        );
      });

      await client.query(
        `INSERT INTO backup_runs
         (triggered_by, run_type, backup_name, schedule, status, object_key, checksum, encryption_method, retention_policy_applied)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        ['system', 'restore', backupName, 'manual', 'success', objectKey, checksum, 'AES-256-GCM', false]
      );

      return {
        restored: true,
        restored_at: new Date(),
      };
    } finally {
      try {
        const encPath = path.join('/tmp', `restore_${input.backup_id}.sql.enc`);
        const sqlPath = path.join('/tmp', `restore_${input.backup_id}.sql`);
        if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
        if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
      } catch { }

      await client.query('SELECT pg_advisory_unlock($1)', [RESTORE_LOCK_KEY]);
      await client.end();
    }
  }

  static async downloadBackup(backupId: number): Promise<{ filePath: string; fileName: string }> {
    const dbUrl = process.env.DATABASE_URL || '';
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      const meta = await client.query(
        'SELECT backup_id, backup_name, object_key FROM backups WHERE backup_id = $1 AND status = $2',
        [backupId, 'success']
      );

      if (meta.rows.length === 0) {
        const err = new Error('Backup not found');
        (err as any).code = 'BACKUP_NOT_FOUND';
        throw err;
      }

      const objectKey = meta.rows[0].object_key as string;
      const backupName = meta.rows[0].backup_name as string;

      const encPath = path.join('/tmp', `dl_${backupId}.sql.enc`);
      const sqlPath = path.join('/tmp', `${backupName}.sql`);

      const s3 = buildS3Client();
      await getObjectToFile(s3, BUCKET, objectKey, encPath);
      await decryptFile(encPath, sqlPath, process.env.BACKUP_ENCRYPTION_KEY || '');

      try { fs.unlinkSync(encPath); } catch {}

      return { filePath: sqlPath, fileName: `${backupName}.sql` };
    } finally {
      await client.end();
    }
  }

  private static async sanitizeSqlDumpForCompatibility(filePath: string): Promise<void> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const sanitized = content.replace(/^SET transaction_timeout = .*;\n/gm, '');
    if (sanitized !== content) {
      await fs.promises.writeFile(filePath, sanitized, 'utf8');
    }
  }
}
