// File: src/domains/Backup/services/backup-export.service.ts

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { buildS3Client, putObject } from '../utils/s3.util';
import { ExportFormat, ExportResponse } from '../types/backup.types';
import { env } from '@src/shared/config/env';

const PDFDocument = require('pdfkit');

const EXPORT_BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || 'stock-pos-storage';
const EXPORT_PREFIX = 'exports/';

const EXPORT_TABLES: Record<string, string[]> = {
  orders: ['order_id', 'seller_id', 'total_amount', 'created_at'],
  products: ['product_id', 'product_name', 'price'],
};

const EXPORT_DATE_FIELD: Record<string, string> = {
  orders: 'order_date',
  products: 'created_at',
};

function escapeCsv(value: any): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export class BackupExportService {
  static async exportData(format: ExportFormat, table: string, query: any): Promise<ExportResponse> {
    if (!EXPORT_TABLES[table]) {
      const err = new Error('Invalid table');
      (err as any).code = 'BACKUP_EXPORT_ERROR';
      throw err;
    }

    const dbUrl = process.env.DATABASE_URL || '';
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      const allowedCols = EXPORT_TABLES[table];
      const cols = query.columns ? String(query.columns).split(',') : allowedCols;
      const safeCols = cols.filter((c: string) => allowedCols.includes(c));
      if (safeCols.length === 0) {
        const err = new Error('No valid columns requested');
        (err as any).code = 'BACKUP_EXPORT_ERROR';
        throw err;
      }

      let where = '1=1';
      const params: any[] = [];
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

      let fileBuffer: Buffer;
      let extension = format.toLowerCase();
      let tmpPath: string | null = null;

      if (format === 'CSV') {
        const header = safeCols.join(',');
        const body = rows.rows
          .map((r) => safeCols.map((c) => escapeCsv(r[c])).join(','))
          .join('\n');
        fileBuffer = Buffer.from(`${header}\n${body}`);
      } else if (format === 'PDF') {
        const doc = new PDFDocument({ margin: 24 });
        tmpPath = path.join('/tmp', `export_${Date.now()}.pdf`);
        const out = fs.createWriteStream(tmpPath);
        doc.pipe(out);
        doc.text(`Export: ${table}`);
        doc.moveDown();
        rows.rows.forEach((r) => {
          doc.text(safeCols.map((c) => `${c}: ${r[c]}`).join(' | '));
        });
        doc.end();
        await new Promise((resolve) => out.on('finish', resolve));
        fileBuffer = fs.readFileSync(tmpPath);
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
      } else {
        const err = new Error('Invalid format');
        (err as any).code = 'BACKUP_EXPORT_ERROR';
        throw err;
      }

      const fileName = `${table}_${Date.now()}.${extension}`;
      const objectKey = `${EXPORT_PREFIX}${fileName}`;

      const s3 = buildS3Client();
      await putObject(s3, EXPORT_BUCKET, objectKey, fileBuffer);

      const baseUrl = env.API_BASE_URL || `http://localhost:${env.PORT}`;
      const url = `${baseUrl}/storage/${encodeURIComponent(EXPORT_BUCKET)}/${encodeURIComponent(objectKey)}`;

      return {
        file_url: url,
        file_name: fileName,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } finally {
      await client.end();
    }
  }
}
