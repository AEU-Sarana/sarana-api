import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';
import { fileStorageService } from '@src/shared/services/file-storage.service';
import { CreateBackupRequest, CreateBackupResponse } from '@src/domains/Backup/types';
import { auditLogService } from '@src/shared/services/audit-log.service';

const execFileAsync = promisify(execFile);

function sanitizeBackupName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function ensureSqlExtension(name: string): string {
  return name.toLowerCase().endsWith('.sql') ? name : `${name}.sql`;
}

function makeUniqueFilename(baseName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return ensureSqlExtension(`${baseName}_${timestamp}`);
}

async function runPgDump(outputPath: string, includeData: boolean): Promise<void> {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const args = [
    `--dbname=${env.DATABASE_URL}`,
    '--format=plain',
    '--no-owner',
    '--no-acl',
    `--file=${outputPath}`,
  ];

  if (!includeData) {
    args.push('--schema-only');
  }

  await execFileAsync('pg_dump', args);
}

export class BackupService {
  static async createBackup(
    request: CreateBackupRequest,
    currentUserId: number
  ): Promise<CreateBackupResponse> {
    const safeName = sanitizeBackupName(request.backup_name);
    const filename = makeUniqueFilename(safeName);
    const tempPath = path.join('/tmp', filename);

    try {
      await runPgDump(tempPath, request.include_data);
    } catch (error: any) {
      logger.error('Backup generation failed', { error: error.message });
      throw new Error(`Backup generation failed: ${error.message}`);
    }

    let uploadResult;
    let fileSize = 0;
    try {
      const fileBuffer = fs.readFileSync(tempPath);
      fileSize = fileBuffer.length;

      const multerFile: Express.Multer.File = {
        fieldname: 'backup',
        originalname: filename,
        encoding: 'utf8',
        mimetype: 'application/sql',
        size: fileSize,
        buffer: fileBuffer,
        destination: '/tmp',
        filename,
        path: tempPath,
      } as Express.Multer.File;

      uploadResult = await fileStorageService.uploadFile(multerFile, 'backups', {
        filename,
        contentType: 'application/sql',
        metadata: {
          createdBy: String(currentUserId),
          includeData: String(request.include_data),
        },
      });
    } catch (error: any) {
      logger.error('Backup upload failed', { error: error.message });
      throw new Error(`Backup upload failed: ${error.message}`);
    } finally {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError: any) {
        logger.warn('Failed to remove temp backup file', { error: cleanupError.message });
      }
    }

    const createdAt = new Date();

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'CREATE_BACKUP',
      resource: 'Backup',
      details: {
        backup_name: request.backup_name,
        include_data: request.include_data,
        file_key: uploadResult.key,
        file_size: uploadResult.size,
      },
    });

    return {
      backup_id: Date.now(),
      backup_name: request.backup_name,
      file_path: uploadResult.url,
      file_size: uploadResult.size,
      created_at: createdAt,
    };
  }
}
