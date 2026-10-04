"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReportExportProcessor = registerReportExportProcessor;
exports.closeReportExportProcessor = closeReportExportProcessor;
const report_export_queue_1 = require("./report-export.queue");
const process_report_export_job_1 = require("../jobs/process-report-export.job");
const logger_1 = require("../../../shared/utils/logger");
/**
 * Register Report Export Queue Processor
 *
 * Sets up the Bull queue worker to process report export jobs.
 * This should be called during application startup.
 */
function registerReportExportProcessor() {
    const queue = (0, report_export_queue_1.getReportExportQueue)();
    // Process jobs
    queue.process('export-report', async (job) => {
        return await (0, process_report_export_job_1.processReportExportJob)(job);
    });
    logger_1.logger.info('Report export queue processor registered successfully');
}
/**
 * Close Report Export Queue Processor
 *
 * Gracefully closes the queue processor (for graceful shutdown).
 */
async function closeReportExportProcessor() {
    const queue = (0, report_export_queue_1.getReportExportQueue)();
    await queue.close();
    logger_1.logger.info('Report export queue processor closed');
}
//# sourceMappingURL=report-export.processor.js.map