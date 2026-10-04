"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportExportQueue = getReportExportQueue;
exports.closeReportExportQueue = closeReportExportQueue;
const queue_util_1 = require("../../../shared/utils/queue.util");
/**
 * Report Export Queue
 *
 * Singleton queue instance for processing report export jobs.
 */
let reportExportQueue = null;
/**
 * Get or create the report export queue instance
 */
function getReportExportQueue() {
    if (process.env.VERCEL) {
        return {
            add: async () => { throw new Error('Queues are disabled in Vercel serverless environment'); },
            process: () => { },
            close: async () => { },
            on: () => { },
        };
    }
    if (!reportExportQueue) {
        reportExportQueue = queue_util_1.QueueUtil.createQueue('report-export', {
            limiter: {
                max: 10,
                duration: 1000,
            },
        });
    }
    return reportExportQueue;
}
/**
 * Close the report export queue (for graceful shutdown)
 */
async function closeReportExportQueue() {
    if (reportExportQueue) {
        await queue_util_1.QueueUtil.closeQueue(reportExportQueue);
        reportExportQueue = null;
    }
}
//# sourceMappingURL=report-export.queue.js.map