import { Request, Response } from 'express';
import { logger } from '@src/shared/utils/logger';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { ReportService } from '@src/domains/Report/services/report.service';
import { ReportExportService } from '@src/domains/Report/services/report-export.service';
import { FileStorageService } from '@src/shared/services/file-storage.service';
import fs from 'fs';
import path from 'path';
import { DailySalesReportRequest, DailyReportMeta } from '../../types/report.types';
import { Role } from '@src/shared/config/permissions';
import { ValidationException } from '@src/shared/exceptions';

// Helper function (same as StockController)
function getStringValue(value: any): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  return typeof value === 'string' ? value : String(value);
}

export class ReportController {
  private static getTodayUTC(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  }

  /**
   * GET /api/v1/reports/daily
   */
  static async getDailyReport(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const user = req.user as UserPayload;

      const dateStr = getStringValue(req.query.date) || ReportController.getTodayUTC();
      const sellerIdStr = getStringValue(req.query.seller_id);
      let sellerId = sellerIdStr ? parseInt(sellerIdStr, 10) : undefined;
      if (sellerIdStr && Number.isNaN(sellerId)) {
        throw new ValidationException('Invalid seller_id');
      }
      if (user.role === Role.SELLER) {
        sellerId = user.userId;
      }

      logger.info('Get daily report request', {
        userId: user.userId,
        date: dateStr,
        sellerId: sellerIdStr,
        path: req.path,
      });

      const request: DailySalesReportRequest = {
        date: dateStr,
        seller_id: sellerId,
      };

      const response = await ReportService.getDailyReport(request, user.userId, user.role);
      const processingTime = Date.now() - startTime;

      const meta: DailyReportMeta = {
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
    } catch (error: any) {
      logger.error('Get daily report error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/reports/sales
   */
  static async getSalesHistoryReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;

      const today = ReportController.getTodayUTC();
      const startDateStr = getStringValue(req.query.start_date) || today;
      const endDateStr = getStringValue(req.query.end_date) || startDateStr;
      const sellerIdStr = getStringValue(req.query.seller_id);
      const productIdStr = getStringValue(req.query.product_id);
      let sellerId = sellerIdStr ? parseInt(sellerIdStr, 10) : undefined;
      let productId = productIdStr ? parseInt(productIdStr, 10) : undefined;
      if (sellerIdStr && Number.isNaN(sellerId)) {
        throw new ValidationException('Invalid seller_id');
      }
      if (productIdStr && Number.isNaN(productId)) {
        throw new ValidationException('Invalid product_id');
      }
      if (user.role === Role.SELLER) {
        sellerId = user.userId;
      }

      const request = {
        start_date: startDateStr,
        end_date: endDateStr,
        seller_id: sellerId,
        product_id: productId,
        page: getStringValue(req.query.page)
          ? parseInt(getStringValue(req.query.page)!, 10)
          : 1,
        limit: getStringValue(req.query.limit)
          ? parseInt(getStringValue(req.query.limit)!, 10)
          : 20,
      };

      logger.info('Get sales history report request', {
        userId: user.userId,
        filters: request,
        path: req.path,
      });

      const response = await ReportService.getSalesHistoryReport(request, user.userId, user.role);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Sales report retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get sales history report error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/reports/stock
   */
  static async getStockReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;

      const lowStockOnlyStr = getStringValue(req.query.low_stock_only);

      const request = {
        low_stock_only: lowStockOnlyStr === 'true',
      };

      logger.info('Get stock report request', {
        userId: user.userId,
        lowStockOnly: request.low_stock_only,
        path: req.path,
      });

      const response = await ReportService.getStockReport(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Stock report retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get stock report error', {
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
  static async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const {
        report_type,
        format,
        // Daily sales filters
        date,
        // Sales history filters
        start_date,
        end_date,
        seller_id,
        product_id,
        page,
        limit,
        // Stock summary filters
        low_stock_only,
      } = req.body;

      // Default format to XLSX
      const normalizedFormat = (format || 'XLSX').toUpperCase();

      // Build filters object based on report type
      let filters: any = {};

      if (report_type === 'daily_sales') {
        filters = { date };
      } else if (report_type === 'sales_history') {
        filters = {
          start_date,
          end_date,
          seller_id: seller_id ? parseInt(String(seller_id), 10) : undefined,
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
      } else if (report_type === 'stock_summary') {
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

      logger.info('Export report request', {
        userId: user.userId,
        report_type,
        format,
        filters,
      });

      // Process synchronously instead of using queue
      const result = await ReportController.processExportReport({
        userId: user.userId,
        userRole: user.role,
        reportType: report_type,
        filters,
        format: format || 'XLSX',
      });

      logger.info('Export completed successfully', {
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
    } catch (error: any) {
      logger.error('Export report error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Process export report synchronously (extracted from job processor)
   */
  private static async processExportReport(data: {
    userId: number;
    userRole: string;
    reportType: string;
    filters: any;
    format: string;
  }): Promise<{ fileUrl: string; fileName: string }> {
    const { userId, userRole, reportType, filters, format } = data;

    // Generate report data
    let reportData: any[];
    let fileName: string;

    switch (reportType) {
      case 'daily_sales': {
        const dailyReport = await ReportService.getDailyReport(
          { date: filters.date },
          userId,
          userRole
        );
        reportData = ReportService.transformDailyReportForExport(dailyReport);
        fileName = `daily_sales_${filters.date || Date.now()}`;
        break;
      }
      case 'sales_history': {
        const salesReport = await ReportService.getSalesHistoryReport(
          {
            start_date: filters.start_date,
            end_date: filters.end_date,
            seller_id: filters.seller_id,
            product_id: filters.product_id,
            page: filters.page || 1,
            limit: filters.limit || 100, // Use max limit for export
          },
          userId,
          userRole
        );
        reportData = salesReport.sales;
        fileName = `sales_history_${filters.start_date}_${filters.end_date}`;
        break;
      }
      case 'stock_summary': {
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

    // Export to file format
    const normalizedFormat = format.toUpperCase();
    let localFilePath: string;
    let finalFileName: string;
    let displayFileName: string;
    let actualFormat = normalizedFormat;

    if (normalizedFormat === 'PDF') {
      // PDF export not yet implemented, fallback to CSV
      logger.warn('PDF export requested but not implemented, falling back to CSV', {
        reportType,
        userId,
      });
      actualFormat = 'CSV';
      finalFileName = await ReportExportService.exportCSV(
        reportData,
        fileName
      );
      displayFileName = finalFileName.replace('.csv', '.pdf');
      localFilePath = path.join('/tmp', finalFileName);
    } else if (normalizedFormat === 'XLSX') {
      finalFileName = await ReportExportService.exportXLSX(
        { Report: reportData },
        fileName
      );
      displayFileName = finalFileName;
      localFilePath = path.join('/tmp', finalFileName);
    } else {
      // Default to CSV
      finalFileName = await ReportExportService.exportCSV(
        reportData,
        fileName
      );
      displayFileName = finalFileName;
      localFilePath = path.join('/tmp', finalFileName);
    }

    // Read file and upload to MinIO
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileSize = fileBuffer.length;

    // Create a temporary multer-like file object for upload
    const resolvedMimeType =
      actualFormat === 'PDF'
        ? 'application/pdf'
        : actualFormat === 'XLSX'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv';

    const multerFile: Express.Multer.File = {
      fieldname: 'report',
      originalname: finalFileName,
      encoding: 'utf8',
      mimetype: resolvedMimeType,
      size: fileSize,
      buffer: fileBuffer,
      destination: '/tmp',
      filename: finalFileName,
      path: localFilePath,
    } as Express.Multer.File;

    const fileStorageService = new FileStorageService();
    const uploadResult = await fileStorageService.uploadFile(
      multerFile,
      `reports/${Date.now()}`, 
      {
        filename: displayFileName,
        contentType: resolvedMimeType,
        metadata: {
          reportType,
          userId: userId.toString(),
          format: actualFormat,
          requestedFormat: normalizedFormat, 
        },
      }
    );

    // Clean up local file
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

    return {
      fileUrl: uploadResult.url,
      fileName: uploadResult.filename,
    };
  }

}
