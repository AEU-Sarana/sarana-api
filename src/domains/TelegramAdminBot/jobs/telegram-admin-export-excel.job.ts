import type { Job } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { logger } from '@src/shared/utils/logger';
import { FileStorageService } from '@src/shared/services/file-storage.service';
import type { TelegramAdminExportJobPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-export.types';
import { TelegramAdminExcelExportService } from '@src/domains/TelegramAdminBot/services/telegram-admin-excel-export.service';
import { redisConnection } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';

const CACHE_TTL_SECONDS = 60;

export async function processTelegramAdminExportJob(
  job: Job<TelegramAdminExportJobPayload>
) {
  const payload = job.data;
  const {
    chatId,
    requestedByUserId,
    processingMessageId,
    exportType,
    range,
    timezone,
    restoreMenu,
  } = payload;

  const cacheKey = TelegramAdminExcelExportService.getCacheKey(exportType, range, timezone);

  try {
    const cachedUrl = await redisConnection.get(cacheKey);
    if (cachedUrl) {
      const tSendStart = Date.now();
      await TelegramAdminExcelExportService.sendDocumentByUrl(chatId, cachedUrl);
      const tSendMs = Date.now() - tSendStart;

      await TelegramAdminExcelExportService.editProcessingMessage(
        chatId,
        processingMessageId,
        '✅ Excel បានផ្ញើរួចរាល់',
        restoreMenu
      );

      logger.info('Telegram admin export cache hit', {
        jobId: job.id,
        exportType,
        range,
        chatId,
        t_send_ms: tSendMs,
      });

      return { cached: true };
    }

    const tQueryStart = Date.now();
    const { fileName, t_query_ms, t_export_ms } = await TelegramAdminExcelExportService.generateExportFile({
      exportType,
      range,
      timezone,
      requestedByUserId,
    });
    const tQueryMs = t_query_ms ?? (Date.now() - tQueryStart);
    const tExportMs = t_export_ms ?? 0;

    const localFilePath = path.join('/tmp', fileName);

    const tUploadStart = Date.now();
    const uploadResult = await uploadFileToStorage(localFilePath, fileName, exportType, range);
    const tUploadMs = Date.now() - tUploadStart;

    await redisConnection.set(cacheKey, uploadResult.url, 'EX', CACHE_TTL_SECONDS);

    const tSendStart = Date.now();
    await TelegramAdminExcelExportService.sendDocumentByLocalPath(chatId, localFilePath, uploadResult.filename);
    const tSendMs = Date.now() - tSendStart;

    try {
      await fs.unlink(localFilePath);
    } catch {}

    await TelegramAdminExcelExportService.editProcessingMessage(
      chatId,
      processingMessageId,
      '✅ Excel បានផ្ញើរួចរាល់',
      restoreMenu
    );

    logger.info('Telegram admin export completed', {
      jobId: job.id,
      exportType,
      range,
      chatId,
      t_query_ms: tQueryMs,
      t_export_ms: tExportMs,
      t_upload_ms: tUploadMs,
      t_send_ms: tSendMs,
    });

    return {
      fileUrl: uploadResult.url,
      fileName: uploadResult.filename,
    };
  } catch (error: any) {
    logger.error('Telegram admin export failed', {
      jobId: job.id,
      exportType,
      range,
      chatId,
      error: error.message,
    });

    await TelegramAdminExcelExportService.editProcessingMessage(
      chatId,
      processingMessageId,
      '❌ Export failed',
      restoreMenu,
      {
        retryCallback: TelegramAdminExcelExportService.buildRetryCallback(exportType, range),
      }
    );

    throw error;
  }
}

async function uploadFileToStorage(
  localFilePath: string,
  fileName: string,
  exportType: string,
  range?: string
) {
  const stats = await fs.stat(localFilePath);
  const fileSize = stats.size;
  const fileStream = createReadStream(localFilePath);

  const multerFile: Express.Multer.File = {
    fieldname: 'report',
    originalname: fileName,
    encoding: 'utf8',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: fileSize,
    buffer: Buffer.alloc(0),
    destination: '/tmp',
    filename: fileName,
    path: localFilePath,
    stream: fileStream,
  } as Express.Multer.File;

  const fileStorageService = new FileStorageService();
  const uploadResult = await fileStorageService.uploadFile(multerFile, `telegram-exports/${Date.now()}`, {
    filename: fileName,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    metadata: {
      exportType,
      range: range ?? 'all',
    },
  });

  return uploadResult;
}
