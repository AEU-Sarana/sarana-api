import { Worker } from 'bullmq';
import { logger } from '@src/shared/utils/logger';
import { TELEGRAM_ADMIN_STOCK_HISTORY_EXPORT_QUEUE } from './telegram-admin-stock-history-export.queue';
import { processTelegramAdminStockHistoryExportProcessor } from './telegram-admin-stock-history-export.processor';
import { redisOptions } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';

export const startTelegramAdminStockHistoryExportWorker = () => {
  const concurrency = Number(process.env.TELEGRAM_ADMIN_STOCK_HISTORY_WORKER_CONCURRENCY || 3);

  const worker = new Worker(
    TELEGRAM_ADMIN_STOCK_HISTORY_EXPORT_QUEUE,
    processTelegramAdminStockHistoryExportProcessor,
    {
      connection: redisOptions,
      concurrency,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error('Telegram admin stock history export job failed', {
      jobId: job?.id,
      name: job?.name,
      error: err.message,
    });
  });

  worker.on('completed', (job) => {
    logger.info('Telegram admin stock history export job completed', {
      jobId: job.id,
      name: job.name,
    });
  });

  worker.on('error', (error) => {
    logger.error('Telegram admin stock history export worker error', { error: error.message });
  });

  logger.info('Telegram admin stock history export worker started', { concurrency });

  return worker;
};
