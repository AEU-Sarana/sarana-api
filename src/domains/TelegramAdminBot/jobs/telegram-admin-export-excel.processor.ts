import type { Job } from 'bullmq';
import type { TelegramAdminExportJobPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-export.types';
import { processTelegramAdminExportJob } from './telegram-admin-export-excel.job';

export async function processTelegramAdminExportExcelProcessor(
  job: Job<TelegramAdminExportJobPayload>
) {
  return processTelegramAdminExportJob(job);
}
