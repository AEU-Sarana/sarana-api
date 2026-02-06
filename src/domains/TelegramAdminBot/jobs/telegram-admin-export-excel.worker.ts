import { Worker } from 'bullmq';
import { logger } from '@src/shared/utils/logger';
import { TELEGRAM_ADMIN_EXPORT_QUEUE } from './telegram-admin-export-excel.queue';
import { processTelegramAdminExportJob } from './telegram-admin-export-excel.job';
import { redisOptions } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';

export const startTelegramAdminExportWorker = () => {
  const concurrency = Number(process.env.TELEGRAM_ADMIN_EXPORT_WORKER_CONCURRENCY || 3);

  const worker = new Worker(TELEGRAM_ADMIN_EXPORT_QUEUE, processTelegramAdminExportJob, {
    connection: redisOptions,
    concurrency,
  });

  worker.on('failed', (job, err) => {
    logger.error('Telegram admin export job failed', {
      jobId: job?.id,
      name: job?.name,
      error: err.message,
    });
  });

  worker.on('completed', (job) => {
    logger.info('Telegram admin export job completed', {
      jobId: job.id,
      name: job.name,
    });
  });

  worker.on('error', (error) => {
    logger.error('Telegram admin export worker error', { error: error.message });
  });

  logger.info('Telegram admin export worker started', { concurrency });

  return worker;
};
