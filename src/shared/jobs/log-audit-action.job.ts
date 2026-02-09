import { Job } from 'bull';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { logger } from '@src/shared/utils/logger';

export interface AuditLogJobData {
  userId: number;
  action: string;
  resource: string;
  entityId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Process audit log job
 */
export async function processAuditLogJob(job: Job<AuditLogJobData>): Promise<void> {
  try {
    const { data } = job;
    await auditLogService.createAuditLog(data);
    logger.info('Audit log job processed successfully', { jobId: job.id });
  } catch (error) {
    logger.error('Failed to process audit log job:', error);
    throw error; // Retry job
  }
}