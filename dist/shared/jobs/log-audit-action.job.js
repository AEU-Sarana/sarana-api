"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAuditLogJob = processAuditLogJob;
const audit_log_service_1 = require("../../shared/services/audit-log.service");
const logger_1 = require("../../shared/utils/logger");
/**
 * Process audit log job
 */
async function processAuditLogJob(job) {
    try {
        const { data } = job;
        await audit_log_service_1.auditLogService.createAuditLog(data);
        logger_1.logger.info('Audit log job processed successfully', { jobId: job.id });
    }
    catch (error) {
        logger_1.logger.error('Failed to process audit log job:', error);
        throw error; // Retry job
    }
}
//# sourceMappingURL=log-audit-action.job.js.map