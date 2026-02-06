import type { Job } from 'bullmq';
import type { TelegramAdminStockHistoryExportJobPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-history.types';
import { processTelegramAdminStockHistoryExportJob } from './telegram-admin-stock-history-export.job';

export async function processTelegramAdminStockHistoryExportProcessor(
  job: Job<TelegramAdminStockHistoryExportJobPayload>
) {
  return processTelegramAdminStockHistoryExportJob(job);
}
