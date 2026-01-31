import { Job } from 'bull';
import { logger } from '@src/shared/utils/logger';
import { ReportService } from '@src/domains/Report/services/report.service';
import prisma from '@src/database/client';
import { Role } from '@src/shared/config/permissions';
import { ReportExportService } from '@src/domains/Report/services/report-export.service';
import { FileStorageService } from '@src/shared/services/file-storage.service';
import type {
  ReportExportJobData,
  ReportExportJobResult,
} from '../queues/report-export.queue';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';

/**
 * Process Report Export Job
 *
 * This function is called by the Bull queue worker to process report export jobs.
 * It generates the report, exports it to CSV, and uploads it to MinIO.
 *
 * @param job - Bull job instance containing the export request data
 * @returns Export result with file URL and metadata
 */
export async function processReportExportJob(
  job: Job<ReportExportJobData>
): Promise<ReportExportJobResult> {
  const { userId, reportType, filters, format: requestedFormat } = job.data;
  const safeJobId = getSafeJobId(job.id);

  logger.info('Processing report export job', {
    jobId: safeJobId,
    userId,
    reportType,
    requestedFormat,
    filters,
  });

  let localFilePath: string | null = null;

  try {
    await job.progress(10);

    // Step 1: Generate report data and determine filename
    const { reportData, fileName } = await generateReportData(reportType, filters, userId);

    await job.progress(30);

    // Step 2: Export to file and determine actual format
    const { finalFileName, actualFormat } = await exportReportToFile(
      reportData,
      fileName,
      requestedFormat,
      safeJobId,
      reportType
    );

    localFilePath = path.join('/tmp', finalFileName);

    await job.progress(50);

    // Step 3: Upload file to MinIO using streams
    const uploadResult = await uploadFileToStorage(
      localFilePath,
      finalFileName,
      actualFormat,
      safeJobId,
      userId,
      reportType
    );

    await job.progress(90);

    const result: ReportExportJobResult = {
      fileUrl: uploadResult.url,
      filePath: uploadResult.key,
      fileSize: uploadResult.size,
      fileName: uploadResult.filename,
    };

    await job.progress(100);

    logger.info('Report export job completed successfully', {
      jobId: safeJobId,
      userId,
      reportType,
      actualFormat,
      fileUrl: result.fileUrl,
      fileSize: result.fileSize,
    });

    return result;

  } catch (error: any) {
    logger.error('Report export job failed', {
      jobId: safeJobId,
      userId,
      reportType,
      requestedFormat,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  } finally {
    // Guaranteed cleanup of temporary file
    if (localFilePath) {
      await cleanupTemporaryFile(localFilePath, safeJobId);
    }
  }
}

/**
 * Safely extract job ID, handling undefined or non-string values
 */
function getSafeJobId(jobId: string | number | undefined): string {
  if (typeof jobId === 'string') return jobId;
  if (typeof jobId === 'number') return jobId.toString();
  return 'unknown';
}

/**
 * Generate report data based on report type
 */
async function generateReportData(
  reportType: string,
  filters: any,
  userId: number
): Promise<{ reportData: any[]; fileName: string }> {
  let reportData: any[];
  let fileName: string;
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { role: true },
  });
  if (!user) {
    throw new Error('User not found');
  }
  const userRole = user.role || Role.SELLER;

  switch (reportType) {
    case 'daily': {
      validateDailyReportFilters(filters);
      const dailyReport = await ReportService.getDailyReport(
        { date: filters.date },
        userId,
        userRole
      );
      reportData = ReportService.transformDailyReportForExport(dailyReport);
      fileName = `daily_sales_${filters.date}`;
      break;
    }
    case 'sales': {
      validateSalesReportFilters(filters);
      const salesReport = await ReportService.getSalesHistoryReport(
        {
          start_date: filters.start_date,
          end_date: filters.end_date,
          seller_id: filters.seller_id,
          product_id: filters.product_id,
          page: filters.page || 1,
          limit: filters.limit || 100, // Use max limit for export (validator allows 1-100)
        },
        userId,
        userRole
      );
      reportData = salesReport.sales;
      fileName = `sales_history_${filters.start_date}_${filters.end_date}`;
      break;
    }
    case 'stock': {
      const stockReport = await ReportService.getStockReport(
        { low_stock_only: filters.low_stock_only },
        userId
      );
      reportData = stockReport.stock_report;
      fileName = `stock_report_${Date.now()}`;
      break;
    }
    default:
      throw new Error(`Invalid report type: ${reportType}`);
  }

  if (!reportData || reportData.length === 0) {
    throw new Error('No data available to export');
  }

  return { reportData, fileName };
}

/**
 * Validate filters for daily report
 */
function validateDailyReportFilters(filters: any): void {
  if (!filters.date) {
    throw new Error('Date is required for daily report');
  }
}

/**
 * Validate filters for sales report
 */
function validateSalesReportFilters(filters: any): void {
  if (!filters.start_date || !filters.end_date) {
    throw new Error('Start date and end date are required for sales report');
  }
}

/**
 * Export report data to file and determine actual format
 */
async function exportReportToFile(
  reportData: any[],
  baseFileName: string,
  requestedFormat: string,
  jobId: string,
  reportType: string
): Promise<{ finalFileName: string; actualFormat: string }> {
  const normalizedRequestedFormat = requestedFormat.toUpperCase();
  const actualFormat = normalizedRequestedFormat === 'PDF' ? 'CSV' : normalizedRequestedFormat;

  if (normalizedRequestedFormat === 'PDF') {
    logger.warn('PDF export requested but not implemented, falling back to CSV', {
      jobId,
      reportType,
    });
  }

  const finalFileName = await ReportExportService.exportCSV(
    reportData,
    `${baseFileName}.csv`
  );

  return { finalFileName, actualFormat };
}

/**
 * Upload file to storage using streams to prevent memory bloat
 */
async function uploadFileToStorage(
  localFilePath: string,
  finalFileName: string,
  actualFormat: string,
  jobId: string,
  userId: number,
  reportType: string
) {
  // Get file stats for size
  const stats = await fs.stat(localFilePath);
  const fileSize = stats.size;

  // Create read stream for upload (prevents loading large files into memory)
  const fileStream = createReadStream(localFilePath);

  // Create multer-like file object for compatibility
  const multerFile: Express.Multer.File = {
    fieldname: 'report',
    originalname: finalFileName,
    encoding: 'utf8',
    mimetype: getMimeType(actualFormat),
    size: fileSize,
    buffer: Buffer.alloc(0), 
    destination: '/tmp',
    filename: finalFileName,
    path: localFilePath,
    stream: fileStream,
  } as Express.Multer.File;

  const fileStorageService = new FileStorageService();

  return await fileStorageService.uploadFile(
    multerFile,
    `reports/${jobId}`,
    {
      filename: finalFileName,
      contentType: getMimeType(actualFormat),
      metadata: {
        reportType,
        userId: userId.toString(),
        jobId,
        format: actualFormat,
        requestedFormat: actualFormat, 
      },
    }
  );
}

/**
 * Get MIME type for format
 */
function getMimeType(format: string): string {
  return format === 'PDF' ? 'application/pdf' : 'text/csv';
}

/**
 * Clean up temporary file with proper error handling
 */
async function cleanupTemporaryFile(localFilePath: string, jobId: string): Promise<void> {
  try {
    await fs.unlink(localFilePath);
    logger.debug('Local file cleaned up', { localFilePath, jobId });
  } catch (cleanupError) {
    logger.warn('Failed to clean up local file', {
      localFilePath,
      jobId,
      error: cleanupError,
    });
  }
}
