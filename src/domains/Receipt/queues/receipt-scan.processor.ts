import { Job } from 'bull';
import { getReceiptScanQueue } from './receipt-scan.queue';
import { processReceiptScanJob } from '@src/domains/Receipt/jobs/process-receipt-scan.job';
import type { ReceiptScanJobData } from './receipt-scan.queue';
import { logger } from '@src/shared/utils/logger';

export function registerReceiptScanProcessor(): void {
  const queue = getReceiptScanQueue();

  queue.process('send-receipt', async (job: Job<ReceiptScanJobData>) => {
    return await processReceiptScanJob(job);
  });

  logger.info('Receipt scan queue processor registered successfully');
}

export async function closeReceiptScanProcessor(): Promise<void> {
  const queue = getReceiptScanQueue();
  await queue.close();
  logger.info('Receipt scan queue processor closed');
}
