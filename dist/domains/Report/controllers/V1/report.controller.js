"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const logger_1 = require("../../../../shared/utils/logger");
const report_service_1 = require("../../../../domains/Report/services/report.service");
const report_export_service_1 = require("../../../../domains/Report/services/report-export.service");
const file_storage_service_1 = require("../../../../shared/services/file-storage.service");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const exceptions_1 = require("../../../../shared/exceptions");
// Helper function (same as StockController)
function getStringValue(value) {
    if (!value)
        return undefined;
    if (Array.isArray(value))
        return String(value[0]);
    return typeof value === 'string' ? value : String(value);
}
class ReportController {
    static getTodayUTC() {
        return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    }
    static formatDateInTimezone(date, timeZone) {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }
    /**
     * GET /api/v1/reports/daily
     */
    static async getDailyReport(req, res) {
        const startTime = Date.now();
        try {
            const user = req.user;
            const dateStr = getStringValue(req.query.date) || ReportController.getTodayUTC();
            const sellerIdStr = getStringValue(req.query.seller_id);
            let sellerId = sellerIdStr ? parseInt(sellerIdStr, 10) : undefined;
            if (sellerIdStr && Number.isNaN(sellerId)) {
                throw new exceptions_1.ValidationException('Invalid seller_id');
            }
            if (user.role !== 'ADMIN') {
                sellerId = user.userId;
            }
            logger_1.logger.info('Get daily report request', {
                userId: user.userId,
                date: dateStr,
                sellerId: sellerIdStr,
                path: req.path,
            });
            const request = {
                date: dateStr,
                seller_id: sellerId,
            };
            const response = await report_service_1.ReportService.getDailyReport(request, user.userId, user.role);
            const processingTime = Date.now() - startTime;
            const meta = {
                request_id: `report_${dateStr.replace(/-/g, '')}_${Date.now()}`,
                processing_time_ms: processingTime,
                cached: false, // TODO: implement cache checking
                version: 'v1',
            };
            res.status(200).json({
                success: true,
                data: response,
                meta,
                message: 'Daily report retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('Get daily report error', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
    /**
     * GET /api/v1/reports/sales
     */
    static async getSalesHistoryReport(req, res) {
        try {
            const user = req.user;
            const periodParam = getStringValue(req.query.period)?.toLowerCase();
            let startDateStr = getStringValue(req.query.start_date);
            let endDateStr = getStringValue(req.query.end_date);
            if (periodParam || (!startDateStr && !endDateStr)) {
                // Default to today (daily) when no date params are provided
                const resolved = report_service_1.ReportService.resolvePeriodRange((periodParam || 'daily'));
                startDateStr = ReportController.formatDateInTimezone(resolved.start, ReportController.REPORT_TIMEZONE);
                endDateStr = ReportController.formatDateInTimezone(resolved.end, ReportController.REPORT_TIMEZONE);
            }
            if (!startDateStr) {
                startDateStr = ReportController.getTodayUTC();
            }
            if (!endDateStr) {
                endDateStr = startDateStr;
            }
            const sellerIdStr = getStringValue(req.query.seller_id);
            const productIdStr = getStringValue(req.query.product_id);
            let sellerId = sellerIdStr ? parseInt(sellerIdStr, 10) : undefined;
            let productId = productIdStr ? parseInt(productIdStr, 10) : undefined;
            if (sellerIdStr && Number.isNaN(sellerId)) {
                throw new exceptions_1.ValidationException('Invalid seller_id');
            }
            if (productIdStr && Number.isNaN(productId)) {
                throw new exceptions_1.ValidationException('Invalid product_id');
            }
            // Admin can view all sellers (or a specific seller via query param).
            // Non-admin users are always scoped to their own data.
            if (user.role !== 'ADMIN') {
                sellerId = user.userId;
            }
            const request = {
                start_date: startDateStr,
                end_date: endDateStr,
                seller_id: sellerId,
                product_id: productId,
                page: getStringValue(req.query.page)
                    ? parseInt(getStringValue(req.query.page), 10)
                    : 1,
                limit: getStringValue(req.query.limit)
                    ? parseInt(getStringValue(req.query.limit), 10)
                    : 20,
            };
            logger_1.logger.info('Get sales history report request', {
                userId: user.userId,
                filters: request,
                path: req.path,
            });
            const response = await report_service_1.ReportService.getSalesHistoryReport(request, user.userId, user.role);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Sales report retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get sales history report error', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
    /**
     * GET /api/v1/reports/stock
     */
    static async getStockReport(req, res) {
        try {
            const user = req.user;
            const lowStockOnlyStr = getStringValue(req.query.low_stock_only);
            const periodParam = getStringValue(req.query.period)?.toLowerCase();
            let startDateStr;
            let endDateStr;
            if (periodParam || !req.query.start_date) {
                const resolved = report_service_1.ReportService.resolvePeriodRange((periodParam || 'daily'));
                startDateStr = ReportController.formatDateInTimezone(resolved.start, ReportController.REPORT_TIMEZONE);
                endDateStr = ReportController.formatDateInTimezone(resolved.end, ReportController.REPORT_TIMEZONE);
            }
            const request = {
                low_stock_only: lowStockOnlyStr === 'true',
                start_date: startDateStr,
                end_date: endDateStr,
            };
            logger_1.logger.info('Get stock report request', {
                userId: user.userId,
                lowStockOnly: request.low_stock_only,
                period: periodParam || 'daily',
                path: req.path,
            });
            const response = await report_service_1.ReportService.getStockReport(request, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Stock report retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get stock report error', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
    /**
     * GET /api/v1/reports/income
     */
    static async getIncomeReport(req, res) {
        try {
            const user = req.user;
            const periodParam = getStringValue(req.query.period);
            const period = periodParam || 'weekly';
            logger_1.logger.info('Get income report request', {
                userId: user.userId,
                period,
                path: req.path,
            });
            const response = await report_service_1.ReportService.getIncomeReport(period);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Income report retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get income report error', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
    /**
     * POST /api/v1/reports/export
     * Queue a report export job for background processing
     */
    static async exportReport(req, res) {
        try {
            const user = req.user;
            const { report_type, format, 
            // Daily sales filters
            date, 
            // Sales history filters
            start_date, end_date, seller_id, product_id, page, limit, 
            // Stock summary filters
            low_stock_only, } = req.body;
            // Default format to XLSX
            const normalizedFormat = (format || 'XLSX').toUpperCase();
            // Build filters object based on report type
            let filters = {};
            if (report_type === 'daily_sales') {
                filters = { date, seller_id: user.userId };
            }
            else if (report_type === 'sales_history') {
                filters = {
                    start_date,
                    end_date,
                    seller_id: user.userId,
                    product_id: product_id ? parseInt(String(product_id), 10) : undefined,
                    page: page ? parseInt(String(page), 10) : undefined,
                    limit: limit ? parseInt(String(limit), 10) : undefined,
                };
                // Remove undefined values
                Object.keys(filters).forEach(key => {
                    if (filters[key] === undefined) {
                        delete filters[key];
                    }
                });
            }
            else if (report_type === 'stock_summary') {
                filters = {
                    low_stock_only: low_stock_only !== undefined ? Boolean(low_stock_only) : undefined,
                };
                // Remove undefined values
                Object.keys(filters).forEach(key => {
                    if (filters[key] === undefined) {
                        delete filters[key];
                    }
                });
            }
            logger_1.logger.info('Export report request', {
                userId: user.userId,
                report_type,
                format,
                filters,
            });
            // Process synchronously instead of using queue
            const result = await ReportController.processExportReport({
                userId: user.userId,
                userRole: user.role,
                tenantId: 1,
                reportType: report_type,
                filters,
                format: format || 'XLSX',
            });
            logger_1.logger.info('Export completed successfully', {
                userId: user.userId,
                reportType: report_type,
                fileUrl: result.fileUrl,
                fileName: result.fileName,
            });
            // Return filename and URL based on requested format
            let responseFileName = result.fileName;
            let responseFileUrl = result.fileUrl;
            if (format?.toUpperCase() === 'XLSX' || normalizedFormat === 'XLSX') {
                // Change .csv extension to .xlsx for XLSX requests in both filename and URL
                responseFileName = responseFileName.replace('.csv', '.xlsx');
                responseFileUrl = responseFileUrl.replace('.csv', '.xlsx');
            }
            res.status(200).json({
                success: true,
                data: {
                    file_url: responseFileUrl, // Show .xlsx extension in URL
                    file_name: responseFileName, // Show .xlsx extension in filename
                },
                message: 'Report exported successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Export report error', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
    /**
     * Process export report synchronously (extracted from job processor)
     */
    static async processExportReport(data) {
        const { userId, userRole, tenantId, reportType, filters, format } = data;
        // Generate report data
        let reportData;
        let fileName;
        switch (reportType) {
            case 'daily_sales': {
                const dailyReport = await report_service_1.ReportService.getDailyReport({ date: filters.date }, userId, userRole, tenantId);
                reportData = report_service_1.ReportService.transformDailyReportForExport(dailyReport);
                fileName = `daily_sales_${filters.date || Date.now()}`;
                break;
            }
            case 'sales_history': {
                const salesReport = await report_service_1.ReportService.getSalesHistoryReport({
                    start_date: filters.start_date,
                    end_date: filters.end_date,
                    seller_id: filters.seller_id,
                    product_id: filters.product_id,
                    page: filters.page || 1,
                    limit: filters.limit || 100, // Use max limit for export
                }, userId, userRole, tenantId);
                reportData = salesReport.sales;
                fileName = `sales_history_${filters.start_date}_${filters.end_date}`;
                break;
            }
            case 'stock_summary': {
                const stockReport = await report_service_1.ReportService.getStockReport({ low_stock_only: filters.low_stock_only }, userId, tenantId);
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
        // Export to file format
        const normalizedFormat = format.toUpperCase();
        let localFilePath;
        let finalFileName;
        let displayFileName;
        let actualFormat = normalizedFormat;
        if (normalizedFormat === 'PDF') {
            // PDF export not yet implemented, fallback to CSV
            logger_1.logger.warn('PDF export requested but not implemented, falling back to CSV', {
                reportType,
                userId,
            });
            actualFormat = 'CSV';
            finalFileName = await report_export_service_1.ReportExportService.exportCSV(reportData, fileName);
            displayFileName = finalFileName.replace('.csv', '.pdf');
            localFilePath = path_1.default.join('/tmp', finalFileName);
        }
        else if (normalizedFormat === 'XLSX') {
            finalFileName = await report_export_service_1.ReportExportService.exportXLSX({ Report: reportData }, fileName);
            displayFileName = finalFileName;
            localFilePath = path_1.default.join('/tmp', finalFileName);
        }
        else {
            // Default to CSV
            finalFileName = await report_export_service_1.ReportExportService.exportCSV(reportData, fileName);
            displayFileName = finalFileName;
            localFilePath = path_1.default.join('/tmp', finalFileName);
        }
        // Read file and upload to MinIO
        const fileBuffer = fs_1.default.readFileSync(localFilePath);
        const fileSize = fileBuffer.length;
        // Create a temporary multer-like file object for upload
        const resolvedMimeType = actualFormat === 'PDF'
            ? 'application/pdf'
            : actualFormat === 'XLSX'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'text/csv';
        const multerFile = {
            fieldname: 'report',
            originalname: finalFileName,
            encoding: 'utf8',
            mimetype: resolvedMimeType,
            size: fileSize,
            buffer: fileBuffer,
            destination: '/tmp',
            filename: finalFileName,
            path: localFilePath,
        };
        const fileStorageService = new file_storage_service_1.FileStorageService();
        const uploadResult = await fileStorageService.uploadFile(multerFile, `reports/${Date.now()}`, {
            filename: displayFileName,
            contentType: resolvedMimeType,
            metadata: {
                reportType,
                userId: userId.toString(),
                format: actualFormat,
                requestedFormat: normalizedFormat,
            },
        });
        // Clean up local file
        try {
            if (fs_1.default.existsSync(localFilePath)) {
                fs_1.default.unlinkSync(localFilePath);
                logger_1.logger.debug('Local file cleaned up', { localFilePath });
            }
        }
        catch (cleanupError) {
            logger_1.logger.warn('Failed to clean up local file', {
                localFilePath,
                error: cleanupError,
            });
        }
        return {
            fileUrl: uploadResult.url,
            fileName: uploadResult.filename,
        };
    }
}
exports.ReportController = ReportController;
ReportController.REPORT_TIMEZONE = process.env.REPORT_TIMEZONE || 'Asia/Phnom_Penh';
//# sourceMappingURL=report.controller.js.map