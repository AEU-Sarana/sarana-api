"use strict";
// File: src/domains/Backup/services/backup-restore.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupRestoreService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const pg_1 = require("pg");
const s3_util_1 = require("../utils/s3.util");
const crypto_util_1 = require("../utils/crypto.util");
const RESTORE_LOCK_KEY = 9235002;
const BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || process.env.R2_BUCKET_NAME?.replace(/['"]/g, '') || 'stock-pos-storage';
class BackupRestoreService {
    static async restoreBackup(input) {
        const dbUrl = process.env.DATABASE_URL || '';
        const client = new pg_1.Client({ connectionString: dbUrl });
        await client.connect();
        try {
            const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [RESTORE_LOCK_KEY]);
            if (!lockRes.rows[0]?.locked) {
                const err = new Error('Restore already running');
                err.code = 'BACKUP_CONFLICT';
                throw err;
            }
            const meta = await client.query('SELECT backup_id, backup_name, object_key, checksum FROM backups WHERE backup_id = $1 AND status = $2', [input.backup_id, 'success']);
            if (meta.rows.length === 0) {
                const err = new Error('Backup not found');
                err.code = 'BACKUP_NOT_FOUND';
                throw err;
            }
            const objectKey = meta.rows[0].object_key;
            const backupName = meta.rows[0].backup_name;
            const checksum = meta.rows[0].checksum;
            const encPath = path_1.default.join('/tmp', `restore_${input.backup_id}.sql.enc`);
            const sqlPath = path_1.default.join('/tmp', `restore_${input.backup_id}.sql`);
            const s3 = (0, s3_util_1.buildS3Client)();
            await (0, s3_util_1.getObjectToFile)(s3, BUCKET, objectKey, encPath);
            await (0, crypto_util_1.decryptFile)(encPath, sqlPath, process.env.BACKUP_ENCRYPTION_KEY || '');
            await this.sanitizeSqlDumpForCompatibility(sqlPath);
            await new Promise((resolve, reject) => {
                let restoreError = '';
                const proc = (0, child_process_1.spawn)('psql', [
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
                proc.on('close', (code) => code === 0
                    ? resolve()
                    : reject(new Error(restoreError ? `psql restore failed: ${restoreError.trim()}` : 'psql restore failed')));
            });
            await client.query(`INSERT INTO backup_runs
         (triggered_by, run_type, backup_name, schedule, status, object_key, checksum, encryption_method, retention_policy_applied)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, ['system', 'restore', backupName, 'manual', 'success', objectKey, checksum, 'AES-256-GCM', false]);
            return {
                restored: true,
                restored_at: new Date(),
            };
        }
        finally {
            try {
                const encPath = path_1.default.join('/tmp', `restore_${input.backup_id}.sql.enc`);
                const sqlPath = path_1.default.join('/tmp', `restore_${input.backup_id}.sql`);
                if (fs_1.default.existsSync(encPath))
                    fs_1.default.unlinkSync(encPath);
                if (fs_1.default.existsSync(sqlPath))
                    fs_1.default.unlinkSync(sqlPath);
            }
            catch { }
            await client.query('SELECT pg_advisory_unlock($1)', [RESTORE_LOCK_KEY]);
            await client.end();
        }
    }
    static async downloadBackup(backupId) {
        const dbUrl = process.env.DATABASE_URL || '';
        const client = new pg_1.Client({ connectionString: dbUrl });
        await client.connect();
        try {
            const meta = await client.query('SELECT backup_id, backup_name, object_key FROM backups WHERE backup_id = $1 AND status = $2', [backupId, 'success']);
            if (meta.rows.length === 0) {
                const err = new Error('Backup not found');
                err.code = 'BACKUP_NOT_FOUND';
                throw err;
            }
            const objectKey = meta.rows[0].object_key;
            const backupName = meta.rows[0].backup_name;
            const encPath = path_1.default.join('/tmp', `dl_${backupId}.sql.enc`);
            const sqlPath = path_1.default.join('/tmp', `${backupName}.sql`);
            const s3 = (0, s3_util_1.buildS3Client)();
            await (0, s3_util_1.getObjectToFile)(s3, BUCKET, objectKey, encPath);
            await (0, crypto_util_1.decryptFile)(encPath, sqlPath, process.env.BACKUP_ENCRYPTION_KEY || '');
            try {
                fs_1.default.unlinkSync(encPath);
            }
            catch { }
            return { filePath: sqlPath, fileName: `${backupName}.sql` };
        }
        finally {
            await client.end();
        }
    }
    static async sanitizeSqlDumpForCompatibility(filePath) {
        const content = await fs_1.default.promises.readFile(filePath, 'utf8');
        const sanitized = content.replace(/^SET transaction_timeout = .*;\n/gm, '');
        if (sanitized !== content) {
            await fs_1.default.promises.writeFile(filePath, sanitized, 'utf8');
        }
    }
}
exports.BackupRestoreService = BackupRestoreService;
//# sourceMappingURL=backup-restore.service.js.map