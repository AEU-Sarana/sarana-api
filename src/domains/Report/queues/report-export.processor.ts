import { Job } from 'bull';
import { getReportExportQueue } from './report-export.queue';
import { processReportExportJob } from '../jobs/process-report-export.job';
import type { ReportExportJobData } from './report-export.queue';
import { logger } from '@src/shared/utils/logger';

/**
 * Register Report Export Queue Processor
 * 
 * Sets up the Bull queue worker to process report export jobs.
 * This should be called during application startup.
 */
export function registerReportExportProcessor(): void {
  const queue = getReportExportQueue();

  // Process jobs
  queue.process('export-report', async (job: Job<ReportExportJobData>) => {
    return await processReportExportJob(job);
  });

  logger.info('Report export queue processor registered successfully');
}

/**
 * Close Report Export Queue Processor
 * 
 * Gracefully closes the queue processor (for graceful shutdown).
 */
export async function closeReportExportProcessor(): Promise<void> {
  const queue = getReportExportQueue();
  await queue.close();
  logger.info('Report export queue processor closed');
}
