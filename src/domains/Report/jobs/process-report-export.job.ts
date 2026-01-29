import { Job } from 'bull';
import { logger } from '@src/shared/utils/logger';
import { ReportService } from '@src/domains/Report/services/report.service';
import { ReportExportService } from '@src/domains/Report/services/report-export.service';
import { FileStorageService } from '@src/shared/services/file-storage.service';
import type {
  ReportExportJobData,
  ReportExportJobResult,
} from '../queues/report-export.queue';
import fs from 'fs';
import path from 'path';

/**
 * Process Report Export Job
 * 
 * This function is called by the Bull queue worker to process report export jobs.
 * It generates the report, exports it to the requested format, and uploads it to MinIO.
 * 
 * @param job - Bull job instance containing the export request data
 * @returns Export result with file URL and metadata
 */
export async function processReportExportJob(
  job: Job<ReportExportJobData>
): Promise<ReportExportJobResult> {
  const { userId, reportType, filters, format } = job.data;
  const jobId = job.id;

  logger.info('Processing report export job', {
    jobId,
    userId,
    reportType,
    format,
    filters,
  });

  let fileName = 'report';

  try {
    // Update job progress
    await job.progress(10);

    // Step 1: Generate report data
    let reportData: any[];

    switch (reportType) {
      case 'daily': {
        if (!filters.date) {
          throw new Error('Date is required for daily report');
        }
        const dailyReport = await ReportService.getDailyReport(
          { date: filters.date },
          userId
        );
        reportData = ReportService.transformDailyReportForExport(dailyReport);
        fileName = `daily_sales_${filters.date}`;
        break;
      }
      case 'sales': {
        if (!filters.start_date || !filters.end_date) {
          throw new Error('Start date and end date are required for sales report');
        }
        const salesReport = await ReportService.getSalesHistoryReport(
          {
            start_date: filters.start_date,
            end_date: filters.end_date,
            seller_id: filters.seller_id,
            product_id: filters.product_id,
            page: filters.page || 1,
            limit: filters.limit || 100, // Use max limit for export (validator allows 1-100)
          },
          userId
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

    await job.progress(40);

    // Step 2: Export to file format
    const normalizedFormat = format.toUpperCase();
    let localFilePath: string;
    let finalFileName: string;

    if (normalizedFormat === 'PDF') {
      // PDF export not yet implemented, fallback to CSV
      logger.warn('PDF export requested but not implemented, falling back to CSV', {
        jobId,
        reportType,
      });
      finalFileName = await ReportExportService.exportCSV(
        reportData,
        `${fileName}.csv`
      );
      localFilePath = path.join('/tmp', finalFileName);
    } else {
      finalFileName = await ReportExportService.exportCSV(
        reportData,
        `${fileName}.csv`
      );
      localFilePath = path.join('/tmp', finalFileName);
    }

    await job.progress(60);

    // Step 3: Read file and upload to MinIO
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileSize = fileBuffer.length;

    // Create a temporary multer-like file object for upload
    const multerFile: Express.Multer.File = {
      fieldname: 'report',
      originalname: finalFileName,
      encoding: 'utf8',
      mimetype: normalizedFormat === 'PDF' ? 'application/pdf' : 'text/csv',
      size: fileSize,
      buffer: fileBuffer,
      destination: '/tmp',
      filename: finalFileName,
      path: localFilePath,
    } as Express.Multer.File;

    const fileStorageService = new FileStorageService();
    const uploadResult = await fileStorageService.uploadFile(
      multerFile,
      `reports/${jobId}`,
      {
        filename: finalFileName,
        contentType: normalizedFormat === 'PDF' ? 'application/pdf' : 'text/csv',
        metadata: {
          reportType,
          userId: userId.toString(),
          jobId: jobId.toString(),
          format: normalizedFormat,
        },
      }
    );

    await job.progress(90);

    // Step 4: Clean up local file
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        logger.debug('Local file cleaned up', { localFilePath });
      }
    } catch (cleanupError) {
      logger.warn('Failed to clean up local file', {
        localFilePath,
        error: cleanupError,
      });
    }

    await job.progress(100);

    const result: ReportExportJobResult = {
      fileUrl: uploadResult.url,
      filePath: uploadResult.key,
      fileSize: uploadResult.size,
      fileName: uploadResult.filename,
    };

    logger.info('Report export job completed successfully', {
      jobId,
      userId,
      reportType,
      fileUrl: result.fileUrl,
      fileSize: result.fileSize,
    });

    return result;
  } catch (error: any) {
    logger.error('Report export job failed', {
      jobId,
      userId,
      reportType,
      error: error.message,
      stack: error.stack,
    });

    // Clean up local file if it exists
    try {
      const tmpFile = path.join('/tmp', `${fileName}.csv`);
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw error; 
  }
}