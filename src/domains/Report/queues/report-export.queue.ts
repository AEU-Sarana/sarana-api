import { QueueUtil } from '@src/shared/utils/queue.util';
import { Queue } from 'bull';

/**
 * Report Export Job Data
 */
export interface ReportExportJobData {
  userId: number;
  reportType: 'daily' | 'sales' | 'stock';
  filters: {
    date?: string;
    start_date?: string;
    end_date?: string;
    seller_id?: number;
    product_id?: number;
    low_stock_only?: boolean;
    page?: number;
    limit?: number;
  };
  format: 'CSV' | 'PDF' | 'XLSX';
}

/**
 * Report Export Job Result
 */
export interface ReportExportJobResult {
  fileUrl: string;
  filePath: string;
  fileSize: number;
  fileName: string;
}

/**
 * Report Export Queue
 * 
 * Singleton queue instance for processing report export jobs.
 */
let reportExportQueue: Queue<ReportExportJobData> | null = null;

/**
 * Get or create the report export queue instance
 */
export function getReportExportQueue(): Queue<ReportExportJobData> {
  if (process.env.VERCEL) {
    return {
      add: async () => { throw new Error('Queues are disabled in Vercel serverless environment'); },
      process: () => {},
      close: async () => {},
      on: () => {},
    } as unknown as Queue<ReportExportJobData>;
  }

  if (!reportExportQueue) {
    reportExportQueue = QueueUtil.createQueue<ReportExportJobData>('report-export', {
      limiter: {
        max: 10, 
        duration: 1000, 
      },
    });
  }
  return reportExportQueue;
}

/**
 * Close the report export queue (for graceful shutdown)
 */
export async function closeReportExportQueue(): Promise<void> {
  if (reportExportQueue) {
    await QueueUtil.closeQueue(reportExportQueue);
    reportExportQueue = null;
  }
}
