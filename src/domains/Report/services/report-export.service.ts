import fs from 'fs';
import path from 'path';
import { logger } from '@src/shared/utils/logger';

export class ReportExportService {
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