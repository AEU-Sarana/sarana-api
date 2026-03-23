import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { logger } from '@src/shared/utils/logger';

export class ReportExportService {
  private static extractHeaders(rows: any[]): string[] {
    const keys: string[] = [];
    const keySet = new Set<string>();

    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      for (const key of Object.keys(row)) {
        if (!keySet.has(key)) {
          keySet.add(key);
          keys.push(key);
        }
      }
    }

    return keys;
  }

  private static computeColumnWidths(headers: string[], rows: any[]): number[] {
    return headers.map((header) => {
      let maxLength = [...header].length;

      for (const row of rows) {
        const value = row?.[header];
        const text =
          value === null || value === undefined
            ? ''
            : value instanceof Date
              ? value.toISOString()
              : String(value);
        const length = [...text].length;
        if (length > maxLength) {
          maxLength = length;
        }
      }

      return Math.max(25, maxLength + 8);
    });
  }

  private static columnNumberToName(value: number): string {
    if (value <= 0) return 'A';
    let num = value;
    let name = '';
    while (num > 0) {
      const rem = (num - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      num = Math.floor((num - 1) / 26);
    }
    return name;
  }

  /**
   * Export data to CSV format
   * @param data Array of objects to export
   * @param fileName Optional filename (without path)
   * @returns The filename of the created file
  */
  static async exportCSV(data: any[], fileName?: string): Promise<string> {
    if (!data || data.length === 0) {
      throw new Error('No data provided for CSV export');
    }

    try {
      // Extract headers from all objects (union of all keys)
      const allKeys = new Set<string>();
      data.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
      });
      const headers = Array.from(allKeys);

      if (headers.length === 0) {
        throw new Error('No headers found in data');
      }

      const csvRows: string[] = [];
      
      // Add headers
      csvRows.push(headers.map(h => this.escapeCSVValue(h)).join(','));

      // Add data rows
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          return this.escapeCSVValue(value);
        });
        csvRows.push(values.join(','));
      }

      const csv = csvRows.join('\n');

      // Ensure /tmp directory exists
      const tmpDir = '/tmp';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const finalFileName = fileName ? `${fileName}.csv` : `report_${Date.now()}.csv`;
      const filePath = path.join(tmpDir, finalFileName);

      fs.writeFileSync(filePath, csv, 'utf8');
      
      logger.info('CSV file exported successfully', {
        fileName: finalFileName,
        filePath,
        rowCount: data.length,
      });

      return finalFileName;
    } catch (error: any) {
      logger.error('CSV export error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Export data to XLSX format with multiple sheets
   */
  static async exportXLSX(
    sheets: Record<string, any[]>,
    fileName?: string
  ): Promise<string> {
    const sheetEntries = Object.entries(sheets);
    if (sheetEntries.length === 0) {
      throw new Error('No sheets provided for XLSX export');
    }

    try {
      const workbook = new ExcelJS.Workbook();

      for (const [sheetName, data] of sheetEntries) {
        const safeName = sheetName.slice(0, 31);
        const rows = Array.isArray(data) ? data : [];
        const headers = this.extractHeaders(rows);
        const normalizedHeaders = headers.length > 0 ? headers : [''];

        const worksheet = workbook.addWorksheet(safeName);

        // Title row (larger font)
        const titleRow = worksheet.addRow([sheetName]);
        titleRow.font = { size: 22, bold: true };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow.height = 28;

        const lastColumnName = this.columnNumberToName(normalizedHeaders.length);
        if (normalizedHeaders.length > 1) {
          worksheet.mergeCells(`A1:${lastColumnName}1`);
        }

        // Header row
        const headerRow = worksheet.addRow(normalizedHeaders);
        headerRow.font = { bold: true, size: 14 };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.height = 24;

        // Data rows
        for (const row of rows) {
          const values = normalizedHeaders.map((header) => {
            if (!header) return '';
            const value = row?.[header];
            return value === undefined ? '' : value;
          });
          worksheet.addRow(values);
        }

        // Freeze title + header rows
        worksheet.views = [{ state: 'frozen', ySplit: 2 }];

        // Auto width columns
        const widths = this.computeColumnWidths(normalizedHeaders, rows);
        widths.forEach((width, index) => {
          worksheet.getColumn(index + 1).width = width;
        });
      }

      const tmpDir = '/tmp';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const finalFileName = fileName ? `${fileName}.xlsx` : `report_${Date.now()}.xlsx`;
      const filePath = path.join(tmpDir, finalFileName);

      await workbook.xlsx.writeFile(filePath);

      logger.info('XLSX file exported successfully', {
        fileName: finalFileName,
        filePath,
        sheetCount: sheetEntries.length,
      });

      return finalFileName;
    } catch (error: any) {
      logger.error('XLSX export error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Escape CSV value to handle commas, quotes, and newlines
   */
  private static escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '""';
    }

    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  /**
   * Export data to PDF format (not yet implemented)
  */
  static async exportPDF(data: any[], fileName?: string): Promise<string> {
    throw new Error('PDF export not implemented yet');
  }
}
