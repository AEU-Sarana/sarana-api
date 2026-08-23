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
import { auditMutationMiddleware } from '@src/shared/middleware/audit-mutation.middleware';
import { responseTimezoneMiddleware } from '@src/shared/middleware/response-timezone.middleware';
import { startBackupSchedulerJob } from '@src/domains/Backup/jobs/backup-scheduler.job';
import { startBackupRetentionCleanupJob } from '@src/domains/Backup/jobs/backup-retention-cleanup.job';
import { startBackupExportCleanupJob } from '@src/domains/Backup/jobs/backup-export-cleanup.job';

// Register event listeners
registerStockEventListeners();
registerReportEventListeners();

// Register queue processors (with error handling)
try {
  registerReportExportProcessor();
} catch (error) {
  console.error('Failed to register report export processor:', error);
}

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


const app: Application = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');
      const allowed = (process.env.ALLOWED_ORIGINS || '*')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''));

      if (allowed.includes('*') || allowed.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Automatically allow ngrok or Cloudflare tunnel origins
      if (
        normalizedOrigin.includes('ngrok-free.dev') ||
        normalizedOrigin.includes('ngrok.io') ||
        normalizedOrigin.includes('trycloudflare.com')
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

// Route normalization (fix for double slashes // causing 404s)
app.use((req, res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/+/g, '/');
  }
  next();
});

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
