"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./shared/config/env");
const api_1 = __importDefault(require("./routes/api"));
const storage_routes_1 = __importDefault(require("./routes/storage.routes"));
const error_middleware_1 = require("./shared/middleware/error.middleware");
const stock_listeners_1 = require("./domains/Stock/events/stock.listeners");
const report_listeners_1 = require("./domains/Report/events/report.listeners");
const report_export_processor_1 = require("./domains/Report/queues/report-export.processor");
const audit_mutation_middleware_1 = require("./shared/middleware/audit-mutation.middleware");
const response_timezone_middleware_1 = require("./shared/middleware/response-timezone.middleware");
const backup_scheduler_job_1 = require("./domains/Backup/jobs/backup-scheduler.job");
const backup_retention_cleanup_job_1 = require("./domains/Backup/jobs/backup-retention-cleanup.job");
const backup_export_cleanup_job_1 = require("./domains/Backup/jobs/backup-export-cleanup.job");
// Register event listeners
(0, stock_listeners_1.registerStockEventListeners)();
(0, report_listeners_1.registerReportEventListeners)();
// Background queue processors and cron schedulers (Disable on Vercel Serverless)
if (!process.env.VERCEL) {
    try {
        (0, report_export_processor_1.registerReportExportProcessor)();
    }
    catch (error) {
        console.error('Failed to register report export processor:', error);
    }
    try {
        (0, backup_scheduler_job_1.startBackupSchedulerJob)();
    }
    catch (error) {
        console.error('Failed to start backup scheduler job:', error);
    }
    try {
        (0, backup_retention_cleanup_job_1.startBackupRetentionCleanupJob)();
    }
    catch (error) {
        console.error('Failed to start backup retention cleanup job:', error);
    }
    try {
        (0, backup_export_cleanup_job_1.startBackupExportCleanupJob)();
    }
    catch (error) {
        console.error('Failed to start backup export cleanup job:', error);
    }
}
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin)
            return callback(null, true);
        const normalizedOrigin = origin.replace(/\/$/, '');
        const allowed = (process.env.ALLOWED_ORIGINS || '*')
            .split(',')
            .map((o) => o.trim().replace(/\/$/, ''));
        if (allowed.includes('*') || allowed.includes(normalizedOrigin)) {
            return callback(null, true);
        }
        // Automatically allow ngrok, Cloudflare tunnels, Vercel deployments, custom domain, or local network IPs
        if (normalizedOrigin.includes('ngrok-free.dev') ||
            normalizedOrigin.includes('ngrok.io') ||
            normalizedOrigin.includes('trycloudflare.com') ||
            normalizedOrigin.includes('vercel.app') ||
            normalizedOrigin.includes('pichchamrouen.com') ||
            normalizedOrigin.includes('localhost') ||
            normalizedOrigin.includes('127.0.0.1') ||
            /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(normalizedOrigin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
}));
// Route normalization (fix for double slashes // causing 404s)
app.use((req, res, next) => {
    if (req.url.includes('//')) {
        req.url = req.url.replace(/\/+/g, '/');
    }
    next();
});
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging
if (env_1.env.NODE_ENV !== 'production') {
    app.use((0, morgan_1.default)('dev'));
}
// Add local datetime fields in API responses
app.use(response_timezone_middleware_1.responseTimezoneMiddleware);
// Storage routes (for serving files) - must be before API routes
app.use('/', storage_routes_1.default);
// API routes
app.use('/api', audit_mutation_middleware_1.auditMutationMiddleware);
app.use('/api', api_1.default);
// Root endpoint
app.get(['/', '/api', '/api/index.js', '/index.js'], (req, res) => {
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
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
//# sourceMappingURL=app.js.map