import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '@src/shared/config/env';
import apiRoutes from '@src/routes/api';
import storageRoutes from '@src/routes/storage.routes';
import { errorMiddleware } from '@src/shared/middleware/error.middleware';
import { registerStockEventListeners } from '@src/domains/Stock/events/stock.listeners';
import { registerReportEventListeners } from '@src/domains/Report/events/report.listeners';
import { registerReportExportProcessor } from '@src/domains/Report/queues/report-export.processor';
import { registerReceiptScanProcessor } from '@src/domains/Receipt/queues/receipt-scan.processor';
import { registerTelegramEventListeners } from './domains/Telegram/events/telegram.listeners';
import { startTelegramDailyReportScheduler } from '@src/domains/Telegram/jobs/telegram-daily-report.scheduler';
import { auditMutationMiddleware } from '@src/shared/middleware/audit-mutation.middleware';
import { responseTimezoneMiddleware } from '@src/shared/middleware/response-timezone.middleware';
import { startTelegramAdminWorker } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.worker';
import { startTelegramAdminExportWorker } from '@src/domains/TelegramAdminBot/jobs/telegram-admin-export-excel.worker';
import { startTelegramAdminStockHistoryExportWorker } from '@src/domains/TelegramAdminBot/jobs/telegram-admin-stock-history-export.worker';
import { startBackupSchedulerJob } from '@src/domains/Backup/jobs/backup-scheduler.job';
import { startBackupRetentionCleanupJob } from '@src/domains/Backup/jobs/backup-retention-cleanup.job';
import { startBackupExportCleanupJob } from '@src/domains/Backup/jobs/backup-export-cleanup.job';
import { startTelegramExpiryAlertScheduler } from '@src/domains/TelegramAdminBot/jobs/telegram-expiry-alert.scheduler';

// Register event listeners
registerStockEventListeners();
registerReportEventListeners();

// Register queue processors (with error handling)
try {
  registerReportExportProcessor();
} catch (error) {
  console.error('Failed to register report export processor:', error);
}

// Register receipt scan worker
try {
  registerReceiptScanProcessor();
} catch (error) {
  console.error('Failed to register receipt scan processor:', error);
}

// Register Telegram admin worker
try {
  startTelegramAdminWorker();
} catch (error) {
  console.error('Failed to start telegram admin worker:', error);
}

// Register Telegram admin export worker
try {
  startTelegramAdminExportWorker();
} catch (error) {
  console.error('Failed to start telegram admin export worker:', error);
}

// Register Telegram admin stock history export worker
try {
  startTelegramAdminStockHistoryExportWorker();
} catch (error) {
  console.error('Failed to start telegram admin stock history export worker:', error);
}

// Register telegram event listeners
registerTelegramEventListeners();

// Start scheduled Telegram daily report
startTelegramDailyReportScheduler();

// Start Backup background jobs
try {
  startBackupSchedulerJob();
} catch (error) {
  console.error('Failed to start backup scheduler job:', error);
}

try {
  startBackupRetentionCleanupJob();
} catch (error) {
  console.error('Failed to start backup retention cleanup job:', error);
}

try {
  startBackupExportCleanupJob();
} catch (error) {
  console.error('Failed to start backup export cleanup job:', error);
}

// Start tiered stock expiry alerts
try {
  startTelegramExpiryAlertScheduler();
} catch (error) {
  console.error('Failed to start telegram expiry alert scheduler:', error);
}


const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Add local datetime fields in API responses
app.use(responseTimezoneMiddleware);

// Storage routes (for serving files) - must be before API routes
app.use('/', storageRoutes);

// API routes
app.use('/api', auditMutationMiddleware);
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Stock POS System API',
    version: '1.0.0',
    docs: '/api/docs',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.path,
  });
});

// Error middleware (must be last)
app.use(errorMiddleware);

export default app;
