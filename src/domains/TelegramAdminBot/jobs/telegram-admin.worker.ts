import { Worker } from 'bullmq';
import { logger } from '@src/shared/utils/logger';
import { TELEGRAM_ADMIN_QUEUE_NAME, redisConnection } from './telegram-admin.queue';
import { processTelegramAdminJob } from './telegram-admin.processor';

export const startTelegramAdminWorker = () => {
  const concurrency = Number(process.env.TELEGRAM_ADMIN_WORKER_CONCURRENCY || 5);

  const worker = new Worker(TELEGRAM_ADMIN_QUEUE_NAME, processTelegramAdminJob, {
    connection: redisConnection,
    concurrency,
  });

  worker.on('failed', (job, err) => {
    logger.error('Telegram admin job failed', {
      jobId: job?.id,
      name: job?.name,
      error: err.message,
    });
  });

  worker.on('completed', (job) => {
    logger.info('Telegram admin job completed', {
      jobId: job.id,
      name: job.name,
    });
  });

  worker.on('error', (error) => {
    logger.error('Telegram admin worker error', { error: error.message });
  });

  logger.info('Telegram admin worker started', { concurrency });

  return worker;
};
