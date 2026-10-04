"use strict";
// File: src/domains/Backup/services/backup-export.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupExportService = void 0;
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const s3_util_1 = require("../utils/s3.util");
const env_1 = require("../../../shared/config/env");
const PDFDocument = require('pdfkit');
const EXPORT_BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || process.env.R2_BUCKET_NAME?.replace(/['"]/g, '') || 'stock-pos-storage';
const EXPORT_PREFIX = 'exports/';
const EXPORT_TABLES = {
    orders: ['order_id', 'seller_id', 'total_amount', 'created_at'],
    products: ['product_id', 'product_name', 'price'],
};
const EXPORT_DATE_FIELD = {
    orders: 'order_date',
    products: 'created_at',
};
function escapeCsv(value) {
    const s = String(value ?? '');
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
class BackupExportService {
    static async exportData(format, table, query) {
        if (!EXPORT_TABLES[table]) {
            const err = new Error('Invalid table');
            err.code = 'BACKUP_EXPORT_ERROR';
            throw err;
        }
        const dbUrl = process.env.DATABASE_URL || '';
        const client = new pg_1.Client({ connectionString: dbUrl });
        await client.connect();
        try {
            const allowedCols = EXPORT_TABLES[table];
            const cols = query.columns ? String(query.columns).split(',') : allowedCols;
            const safeCols = cols.filter((c) => allowedCols.includes(c));
            if (safeCols.length === 0) {
                const err = new Error('No valid columns requested');
                err.code = 'BACKUP_EXPORT_ERROR';
                throw err;
            }
            let where = '1=1';
            const params = [];
            const dateField = EXPORT_DATE_FIELD[table] || 'created_at';
            if (query.start_date) {
                params.push(new Date(`${String(query.start_date)}T00:00:00.000Z`));
                where += ` AND ${dateField} >= $${params.length}`;
            }
            if (query.end_date) {
                params.push(new Date(`${String(query.end_date)}T23:59:59.999Z`));
                where += ` AND ${dateField} <= $${params.length}`;
            }
            if (query.seller_id && safeCols.includes('seller_id')) {
                params.push(query.seller_id);
                where += ` AND seller_id = $${params.length}`;
            }
            const sql = `SELECT ${safeCols.join(',')} FROM ${table} WHERE ${where} ORDER BY created_at DESC`;
            const rows = await client.query(sql, params);
            let fileBuffer;
            let extension = format.toLowerCase();
            let tmpPath = null;
            if (format === 'CSV') {
                const header = safeCols.join(',');
                const body = rows.rows
                    .map((r) => safeCols.map((c) => escapeCsv(r[c])).join(','))
                    .join('\n');
                fileBuffer = Buffer.from(`${header}\n${body}`);
            }
            else if (format === 'PDF') {
                const doc = new PDFDocument({ margin: 24 });
                tmpPath = path_1.default.join('/tmp', `export_${Date.now()}.pdf`);
                const out = fs_1.default.createWriteStream(tmpPath);
                doc.pipe(out);
                doc.text(`Export: ${table}`);
                doc.moveDown();
                rows.rows.forEach((r) => {
                    doc.text(safeCols.map((c) => `${c}: ${r[c]}`).join(' | '));
                });
                doc.end();
                await new Promise((resolve) => out.on('finish', resolve));
                fileBuffer = fs_1.default.readFileSync(tmpPath);
                try {
                    fs_1.default.unlinkSync(tmpPath);
                }
                catch { }
            }
            else {
                const err = new Error('Invalid format');
                err.code = 'BACKUP_EXPORT_ERROR';
                throw err;
            }
            const fileName = `${table}_${Date.now()}.${extension}`;
            const objectKey = `${EXPORT_PREFIX}${fileName}`;
            const s3 = (0, s3_util_1.buildS3Client)();
            await (0, s3_util_1.putObject)(s3, EXPORT_BUCKET, objectKey, fileBuffer);
            const baseUrl = env_1.env.API_BASE_URL || `http://localhost:${env_1.env.PORT}`;
            const url = `${baseUrl}/storage/${encodeURIComponent(EXPORT_BUCKET)}/${encodeURIComponent(objectKey)}`;
            return {
                file_url: url,
                file_name: fileName,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
        }
        finally {
            await client.end();
        }
    }
}
exports.BackupExportService = BackupExportService;
//# sourceMappingURL=backup-export.service.js.map