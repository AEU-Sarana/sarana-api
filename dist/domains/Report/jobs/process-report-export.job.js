"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReportExportJob = processReportExportJob;
const logger_1 = require("../../../shared/utils/logger");
const report_service_1 = require("../../../domains/Report/services/report.service");
const client_1 = __importDefault(require("../../../database/client"));
const permissions_1 = require("../../../shared/config/permissions");
const report_export_service_1 = require("../../../domains/Report/services/report-export.service");
const file_storage_service_1 = require("../../../shared/services/file-storage.service");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
/**
 * Process Report Export Job
 *
 * This function is called by the Bull queue worker to process report export jobs.
 * It generates the report, exports it to CSV, and uploads it to MinIO.
 *
 * @param job - Bull job instance containing the export request data
 * @returns Export result with file URL and metadata
 */
async function processReportExportJob(job) {
    const { userId, reportType, filters, format: requestedFormat } = job.data;
    const safeJobId = getSafeJobId(job.id);
    logger_1.logger.info('Processing report export job', {
        jobId: safeJobId,
        userId,
        reportType,
        requestedFormat,
        filters,
    });
    let localFilePath = null;
    try {
        await job.progress(10);
        // Step 1: Generate report data and determine filename
        const tGenerateStart = Date.now();
        const { reportData, fileName } = await generateReportData(reportType, filters, userId);
        const tGenerateMs = Date.now() - tGenerateStart;
        await job.progress(30);
        // Step 2: Export to file and determine actual format
        const tExportStart = Date.now();
        const { finalFileName, actualFormat } = await exportReportToFile(reportData, fileName, requestedFormat, safeJobId, reportType);
        const tExportMs = Date.now() - tExportStart;
        localFilePath = path_1.default.join('/tmp', finalFileName);
        await job.progress(50);
        // Step 3: Upload file to MinIO using streams
        const tUploadStart = Date.now();
        const uploadResult = await uploadFileToStorage(localFilePath, finalFileName, actualFormat, safeJobId, userId, reportType);
        const tUploadMs = Date.now() - tUploadStart;
        await job.progress(90);
        const result = {
            fileUrl: uploadResult.url,
            filePath: uploadResult.key,
            fileSize: uploadResult.size,
            fileName: uploadResult.filename,
        };
        await job.progress(100);
        logger_1.logger.info('Report export job completed successfully', {
            jobId: safeJobId,
            userId,
            reportType,
            actualFormat,
            fileUrl: result.fileUrl,
            fileSize: result.fileSize,
            t_generate_ms: tGenerateMs,
            t_export_ms: tExportMs,
            t_upload_ms: tUploadMs,
        });
        return result;
    }
    catch (error) {
        logger_1.logger.error('Report export job failed', {
            jobId: safeJobId,
            userId,
            reportType,
            requestedFormat,
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
    finally {
        // Guaranteed cleanup of temporary file
        if (localFilePath) {
            await cleanupTemporaryFile(localFilePath, safeJobId);
        }
    }
}
/**
 * Safely extract job ID, handling undefined or non-string values
 */
function getSafeJobId(jobId) {
    if (typeof jobId === 'string')
        return jobId;
    if (typeof jobId === 'number')
        return jobId.toString();
    return 'unknown';
}
/**
 * Generate report data based on report type
 */
async function generateReportData(reportType, filters, userId) {
    let reportData;
    let fileName;
    const user = await client_1.default.user.findUnique({
        where: { userId },
        select: { role: true },
    });
    if (!user) {
        throw new Error('User not found');
    }
    const userRole = user.role || permissions_1.Role.CASHIER;
    switch (reportType) {
        case 'daily': {
            validateDailyReportFilters(filters);
            const dailyReport = await report_service_1.ReportService.getDailyReport({ date: filters.date }, userId, userRole);
            reportData = report_service_1.ReportService.transformDailyReportForExport(dailyReport);
            fileName = `daily_sales_${filters.date}`;
            break;
        }
        case 'sales': {
            validateSalesReportFilters(filters);
            const salesReport = await report_service_1.ReportService.getSalesHistoryReport({
                start_date: filters.start_date,
                end_date: filters.end_date,
                seller_id: filters.seller_id,
                product_id: filters.product_id,
                page: filters.page || 1,
                limit: filters.limit || 100, // Use max limit for export (validator allows 1-100)
            }, userId, userRole);
            reportData = salesReport.sales;
            fileName = `sales_history_${filters.start_date}_${filters.end_date}`;
            break;
        }
        case 'stock': {
            const stockReport = await report_service_1.ReportService.getStockReport({ low_stock_only: filters.low_stock_only }, userId);
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
function validateDailyReportFilters(filters) {
    if (!filters.date) {
        throw new Error('Date is required for daily report');
    }
}
/**
 * Validate filters for sales report
 */
function validateSalesReportFilters(filters) {
    if (!filters.start_date || !filters.end_date) {
        throw new Error('Start date and end date are required for sales report');
    }
}
/**
 * Export report data to file and determine actual format
 */
async function exportReportToFile(reportData, baseFileName, requestedFormat, jobId, reportType) {
    const normalizedRequestedFormat = requestedFormat.toUpperCase();
    const actualFormat = normalizedRequestedFormat === 'PDF' ? 'CSV' : normalizedRequestedFormat;
    if (normalizedRequestedFormat === 'PDF') {
        logger_1.logger.warn('PDF export requested but not implemented, falling back to CSV', {
            jobId,
            reportType,
        });
    }
    let finalFileName;
    if (normalizedRequestedFormat === 'XLSX') {
        finalFileName = await report_export_service_1.ReportExportService.exportXLSX({ Report: reportData }, baseFileName);
    }
    else {
        finalFileName = await report_export_service_1.ReportExportService.exportCSV(reportData, `${baseFileName}.csv`);
    }
    return { finalFileName, actualFormat };
}
/**
 * Upload file to storage using streams to prevent memory bloat
 */
async function uploadFileToStorage(localFilePath, finalFileName, actualFormat, jobId, userId, reportType) {
    // Get file stats for size
    const stats = await promises_1.default.stat(localFilePath);
    const fileSize = stats.size;
    // Create read stream for upload (prevents loading large files into memory)
    const fileStream = (0, fs_1.createReadStream)(localFilePath);
    // Create multer-like file object for compatibility
    const multerFile = {
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
    };
    const fileStorageService = new file_storage_service_1.FileStorageService();
    return await fileStorageService.uploadFile(multerFile, `reports/${jobId}`, {
        filename: finalFileName,
        contentType: getMimeType(actualFormat),
        metadata: {
            reportType,
            userId: userId.toString(),
            jobId,
            format: actualFormat,
            requestedFormat: actualFormat,
        },
    });
}
/**
 * Get MIME type for format
 */
function getMimeType(format) {
    if (format === 'PDF')
        return 'application/pdf';
    if (format === 'XLSX') {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'text/csv';
}
/**
 * Clean up temporary file with proper error handling
 */
async function cleanupTemporaryFile(localFilePath, jobId) {
    try {
        await promises_1.default.unlink(localFilePath);
        logger_1.logger.debug('Local file cleaned up', { localFilePath, jobId });
    }
    catch (cleanupError) {
        logger_1.logger.warn('Failed to clean up local file', {
            localFilePath,
            jobId,
            error: cleanupError,
        });
    }
}
//# sourceMappingURL=process-report-export.job.js.map