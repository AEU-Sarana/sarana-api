// File: src/domains/Backup/services/backup-create.service.ts

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { Client } from 'pg';
import { buildS3Client, putObject } from '../utils/s3.util';
import { encryptFile, sha256File } from '../utils/crypto.util';
import { CreateBackupRequest, CreateBackupResponse, ListBackupsResponse } from '../types/backup.types';

const BACKUP_LOCK_KEY = 9235001;

const BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || 'stock-pos-storage';
const BACKUP_PREFIX = 'backups/';

export class BackupCreateService {
  static async createBackup(input: CreateBackupRequest): Promise<CreateBackupResponse> {
    const dbUrl = process.env.DATABASE_URL || '';
    const key = process.env.BACKUP_ENCRYPTION_KEY || '';
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      // Advisory lock
      const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [BACKUP_LOCK_KEY]);
      if (!lockRes.rows[0]?.locked) {
        const err = new Error('Backup already running');
        (err as any).code = 'BACKUP_CONFLICT';
        throw err;
      }

      const backupName = input.backup_name;
      const tmpDir = path.join('/tmp', 'backups');
      fs.mkdirSync(tmpDir, { recursive: true });

      const dumpPath = path.join(tmpDir, `${backupName}.sql`);
      const encPath = `${dumpPath}.enc`;

      // Run pg_dump (plain SQL for psql restore)
      await new Promise<void>((resolve, reject) => {
        const outStream = fs.createWriteStream(dumpPath);
        const args = [
          '--format=plain',
          '--no-owner',
          '--no-acl',
          '--clean',
          '--if-exists',
          `--dbname=${dbUrl}`,
        ];
        if (!input.include_data) {
          args.push('--schema-only');
        }

        const proc = spawn('pg_dump', args);
        let dumpError = '';
        let procExited = false;
        let exitCode: number | null = null;
        let streamFinished = false;

        const finalize = () => {
          if (!procExited || !streamFinished) return;
          if (exitCode === 0) {
            resolve();
            return;
          }
          reject(new Error(dumpError ? `pg_dump failed: ${dumpError.trim()}` : 'pg_dump failed'));
        };

        proc.stdout.pipe(outStream);
        proc.stderr.on('data', (d) => {
          const msg = d.toString();
          dumpError += msg;
          process.stderr.write(d);
        });
        outStream.on('error', reject);
        outStream.on('finish', () => {
          streamFinished = true;
          finalize();
        });
        proc.on('error', reject);
        proc.on('close', (code) => {
          procExited = true;
          exitCode = code;
          finalize();
        });
      });

      // Encrypt
      await encryptFile(dumpPath, encPath, key);
      const checksum = sha256File(encPath);

      // Upload to S3
      const objectKey = `${BACKUP_PREFIX}${backupName}.sql.enc`;
      const fileBuffer = fs.readFileSync(encPath);
      const s3 = buildS3Client();
      await putObject(s3, BUCKET, objectKey, fileBuffer);

      const backupStatus = 'success';
      const backupInsert = await client.query(
        `INSERT INTO backups
         (backup_name, object_key, file_size, checksum, status)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING backup_id, created_at`,
        [backupName, objectKey, fileBuffer.length, checksum, backupStatus]
      );
      const backupId = Number(backupInsert.rows[0].backup_id);
      const createdAt: Date = backupInsert.rows[0].created_at;

      const runType = input.triggered_by === 'auto' ? 'auto' : 'manual';
      const schedule = runType === 'auto' ? 'auto' : 'manual';

      // Insert run history
      await client.query(
        `INSERT INTO backup_runs
         (triggered_by, run_type, backup_name, schedule, status, object_key, checksum, encryption_method, retention_policy_applied)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [input.triggered_by || 'system', runType, backupName, schedule, backupStatus, objectKey, checksum, 'AES-256-GCM', false]
      );

      return {
        backup_id: backupId,
        backup_name: backupName,
        file_path: `/${objectKey}`,
        file_size: fileBuffer.length,
        created_at: createdAt,
      };
    } finally {
      try {
        const tmpDir = path.join('/tmp', 'backups');
        const dumpPath = path.join(tmpDir, `${input.backup_name}.sql`);
        const encPath = `${dumpPath}.enc`;
        if (fs.existsSync(dumpPath)) fs.unlinkSync(dumpPath);
        if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
      } catch {}

      await client.query('SELECT pg_advisory_unlock($1)', [BACKUP_LOCK_KEY]);
      await client.end();
    }
  }

  static async listBackups(page: number, limit: number): Promise<ListBackupsResponse> {
    const dbUrl = process.env.DATABASE_URL || '';
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      const offset = (page - 1) * limit;
      const totalRes = await client.query('SELECT COUNT(*) FROM backups WHERE status = $1', ['success']);
      const total = Number(totalRes.rows[0].count || 0);

      const rows = await client.query(
        `SELECT backup_id, backup_name, file_size, created_at FROM backups
         WHERE status='success'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return {
        backups: rows.rows.map((r) => ({
          backup_id: Number(r.backup_id),
          backup_name: r.backup_name,
          file_size: Number(r.file_size),
          created_at: r.created_at,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } finally {
      await client.end();
    }
  }
}
