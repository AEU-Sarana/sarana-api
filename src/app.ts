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
import { registerTelegramEventListeners } from './domains/Telegram/events/telegram.listeners';
import { startTelegramDailyReportScheduler } from '@src/domains/Telegram/jobs/telegram-daily-report.scheduler';
import { auditMutationMiddleware } from '@src/shared/middleware/audit-mutation.middleware';
import { responseTimezoneMiddleware } from '@src/shared/middleware/response-timezone.middleware';

// Register event listeners
registerStockEventListeners();
registerReportEventListeners();

// Register queue processors (with error handling)
try {
  registerReportExportProcessor();
} catch (error) {
  console.error('Failed to register report export processor:', error);
  // Don't crash the app if queue initialization fails
}

// Register telegram event listeners
registerTelegramEventListeners();

// Start scheduled Telegram daily report
startTelegramDailyReportScheduler();


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
