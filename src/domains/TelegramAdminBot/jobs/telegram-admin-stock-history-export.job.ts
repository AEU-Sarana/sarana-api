import type { Job } from 'bullmq';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import axios from 'axios';
import prisma from '@src/database/client';
import { logger } from '@src/shared/utils/logger';
import { ReportExportService } from '@src/domains/Report/services/report-export.service';
import { FileStorageService } from '@src/shared/services/file-storage.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { formatDateInPhnomPenh } from '@src/shared/utils/date-utils';
import { startOfDay, subDays } from 'date-fns';
import { redisConnection } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';
import { TelegramAdminStockService } from '@src/domains/TelegramAdminBot/services/telegram-admin-stock.service';
import { NAV_STOCK_HISTORY } from '@src/domains/Telegram/menu/menu-registry';
import type { TelegramAdminStockHistoryExportJobPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-history.types';

const CACHE_TTL_SECONDS = 60;
const DEFAULT_TIMEZONE = 'Asia/Phnom_Penh';
const MAX_ROWS = 50_000;

export async function processTelegramAdminStockHistoryExportJob(
  job: Job<TelegramAdminStockHistoryExportJobPayload>
) {
  const { chatId, tenantId, processingMessageId, productId, range, timezone } = job.data;
  const tz = timezone ?? DEFAULT_TIMEZONE;
  const cacheKey = buildCacheKey(productId, range, tz);

  try {
    const product = await prisma.product.findFirst({
      where: { productId },
      select: { productCode: true, productName: true },
    });
    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const cachedUrl = await redisConnection.get(cacheKey);
    if (cachedUrl) {
      const tSendStart = Date.now();
      const localPath = await downloadToTemp(cachedUrl);
      await sendDocumentByLocalPath(
        tenantId,
        chatId,
        localPath,
        buildCaption(product.productCode, product.productName, range, false)
      );
      const tSendMs = Date.now() - tSendStart;
      await safeEditMessage(
        tenantId,
        chatId,
        processingMessageId,
        '✅ Excel បានផ្ញើរួចរាល់',
        TelegramAdminStockService.buildStockHistoryKeyboard(productId)
      );
      await safeUnlink(localPath);

      logger.info('Telegram admin stock history export cache hit', {
        jobId: job.id,
        chatId,
        productId,
        range,
        t_send_ms: tSendMs,
      });

      return { cached: true };
    }

    const { start, end } = resolveRange(range, tz);
    const where: any = { productId };
    if (start && end) {
      where.createdAt = { gte: start, lte: end };
    }

    const tQueryStart = Date.now();
    const total = await prisma.stockMovement.count({ where });
    const take = Math.min(total, MAX_ROWS);
    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        user: { select: { username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    const tQueryMs = Date.now() - tQueryStart;

    const capped = total > MAX_ROWS;

    const rows = movements.map((m) => ({
      DateTime: formatDateInPhnomPenh(m.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      'Movement Type': m.movementType,
      Qty: m.quantity,
      Cost: m.cost ? Number(m.cost) : 0,
      Price: m.price ? Number(m.price) : 0,
      Supplier: m.supplier ?? '-',
      Reason: m.reason ?? '-',
      'Order ID': m.orderId ?? '-',
      'Lot ID': m.lotId ?? '-',
      'Created By': m.user?.fullName || m.user?.username || String(m.createdBy),
    }));

    const tExportStart = Date.now();
    const fileName = `stock_history_${product.productCode}_${range}_${Date.now()}`;
    const finalFileName = await ReportExportService.exportXLSX(
      { 'Stock History': rows },
      fileName
    );
    const tExportMs = Date.now() - tExportStart;

    const localFilePath = path.join('/tmp', finalFileName);

    const tUploadStart = Date.now();
    const uploadResult = await uploadFileToStorage(localFilePath, finalFileName, productId, range);
    const tUploadMs = Date.now() - tUploadStart;

    await redisConnection.set(cacheKey, uploadResult.url, 'EX', CACHE_TTL_SECONDS);

    const tSendStart = Date.now();
    await sendDocumentByLocalPath(
      tenantId,
      chatId,
      localFilePath,
      buildCaption(product.productCode, product.productName, range, capped)
    );
    const tSendMs = Date.now() - tSendStart;

    await safeEditMessage(
      tenantId,
      chatId,
      processingMessageId,
      '✅ Excel បានផ្ញើរួចរាល់',
      TelegramAdminStockService.buildStockHistoryKeyboard(productId)
    );

    logger.info('Telegram admin stock history export completed', {
      jobId: job.id,
      chatId,
      productId,
      range,
      total_rows: total,
      exported_rows: movements.length,
      t_query_ms: tQueryMs,
      t_export_ms: tExportMs,
      t_upload_ms: tUploadMs,
      t_send_ms: tSendMs,
    });

    await safeUnlink(localFilePath);

    return { fileUrl: uploadResult.url, fileName: uploadResult.filename };
  } catch (error: any) {
    logger.error('Telegram admin stock history export failed', {
      jobId: job.id,
      chatId,
      productId,
      range,
      error: error.message,
    });

    await safeEditMessage(
      tenantId,
      chatId,
      processingMessageId,
      '❌ Export failed',
      {
        inline_keyboard: [
          [{ text: '🔁 Retry', callback_data: `STOCK_HISTORY_EXPORT:${productId}:${range}` }],
          [{ text: '⬅️ Back', callback_data: NAV_STOCK_HISTORY }],
        ],
      }
    );

    throw error;
  }
}

function buildCaption(productCode: string, productName: string, range: string, capped: boolean) {
  const rangeLabel = range === '30d' ? 'Last 30 days' : 'All';
  const warning = capped ? '\n⚠️ Limited to last 50,000 rows.' : '';
  return `📥 Stock History: ${productCode} - ${productName} (${rangeLabel})${warning}`;
}

function buildCacheKey(productId: number, range: string, timezone: string) {
  const dateKey = getDateKey(range, timezone);
  return `cache:stock_history_export:${productId}:${range}:${dateKey}`;
}

function getDateKey(range: string, timezone: string) {
  if (range === 'all') return 'all';
  const now = getNowInTimezone(timezone);
  return formatDateInPhnomPenh(now, 'yyyy-MM-dd');
}

function resolveRange(range: string, timezone: string) {
  if (range === 'all') {
    return { start: undefined, end: undefined };
  }
  const now = getNowInTimezone(timezone);
  const end = now;
  const start = startOfDay(subDays(now, 30));
  return { start, end };
}

function getNowInTimezone(timeZone: string) {
  return new Date(new Date().toLocaleString('en-US', { timeZone }));
}

async function sendDocumentByLocalPath(tenantId: number, chatId: number, filePath: string, caption: string) {
  const config = await TelegramService.getTelegramConfig(tenantId);
  if (!config) throw new Error('Telegram not configured');
  return TelegramBotService.sendDocument(config.bot_token, String(chatId), filePath, caption);
}

async function uploadFileToStorage(
  localFilePath: string,
  fileName: string,
  productId: number,
  range: string
) {
  const stats = await fs.stat(localFilePath);
  const fileStream = createReadStream(localFilePath);

  const multerFile: Express.Multer.File = {
    fieldname: 'report',
    originalname: fileName,
    encoding: 'utf8',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: stats.size,
    buffer: Buffer.alloc(0),
    destination: '/tmp',
    filename: fileName,
    path: localFilePath,
    stream: fileStream,
  } as Express.Multer.File;

  const fileStorageService = new FileStorageService();
  return fileStorageService.uploadFile(multerFile, `telegram-exports/${Date.now()}`, {
    filename: fileName,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    metadata: {
      exportType: 'STOCK_HISTORY',
      productId: String(productId),
      range,
    },
  });
}

async function downloadToTemp(url: string) {
  const targetPath = path.join('/tmp', `tg_stock_history_${Date.now()}.xlsx`);
  const response = await axios.get(url, { responseType: 'stream' });
  await new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(targetPath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
  return targetPath;
}

async function safeEditMessage(
  tenantId: number,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
) {
  try {
    return await TelegramService.editMessageByChatId(tenantId, chatId, messageId, text, 'Markdown', replyMarkup);
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes('message is not modified')) {
      return;
    }
    throw error;
  }
}

async function safeUnlink(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch { }
}
