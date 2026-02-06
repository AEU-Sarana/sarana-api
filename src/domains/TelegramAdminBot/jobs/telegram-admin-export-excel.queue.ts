import { Queue } from 'bullmq';
import { redisOptions } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';

export const TELEGRAM_ADMIN_EXPORT_QUEUE = 'telegram-admin-export-excel';

export const telegramAdminExportQueue = new Queue(TELEGRAM_ADMIN_EXPORT_QUEUE, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 200 },
    removeOnFail: { age: 24 * 3600 },
  },
});
