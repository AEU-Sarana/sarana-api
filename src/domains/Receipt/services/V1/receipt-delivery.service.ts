import { logger } from '@src/shared/utils/logger';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { ReceiptImageService } from '@src/domains/Receipt/services/V1/receipt-image.service';
import prisma from '@src/database/client';
import type { Prisma } from '@src/database/generated';

type DeliveryKey = {
  receiptLinkId?: number;
  receiptCode?: string;
};

type DeliveryResult = {
  sentNow: boolean;
  alreadySent: boolean;
};

type ExistingDelivery = {
  id: number;
  status: 'SENT' | 'FAILED';
  telegramMessageId?: bigint | null;
};

type ReceiptDeliveryRow = {
  id: number;
  status: string;
  telegramMessageId?: bigint | null;
};

export class ReceiptDeliveryService {
  private static receiptDeliveryColumnCache: Record<string, boolean | undefined> = {};

  static async getExistingDelivery(
    orderId: number,
    telegramChatId: bigint,
    options: DeliveryKey = {}
  ): Promise<ExistingDelivery | null> {
    return this.findExistingDelivery(orderId, telegramChatId, options);
  }

  static async sendReceiptIdempotent(
    orderId: number,
    telegramChatId: bigint,
    options: DeliveryKey = {}
  ): Promise<DeliveryResult> {
    const chatHint = this.formatChatHint(telegramChatId);
    const existing = await this.findExistingDelivery(orderId, telegramChatId, options);

    logger.debug('Receipt delivery lookup', {
      chatHint,
      orderId,
      receiptLinkId: options.receiptLinkId ?? null,
      status: existing?.status ?? null,
      messageId: existing?.telegramMessageId?.toString() ?? null,
    });

    if (existing?.status === 'SENT' && existing.telegramMessageId != null) {
      logger.info('Receipt already delivered to this chat', {
        chatHint,
        orderId,
        messageId: existing.telegramMessageId.toString(),
      });
      return { sentNow: false, alreadySent: true };
    }

    const order = await prisma.order.findUnique({
      where: { orderId },
      select: { receiptNumber: true, tenantId: true },
    });
    if (!order) throw new Error('Order not found');

    const telegramConfig = await TelegramService.getTelegramConfig(order.tenantId);
    if (!telegramConfig) throw new Error('Telegram not configured');

    logger.info('Sending receipt to Telegram', {
      chatHint,
      orderId,
      receiptLinkId: options.receiptLinkId ?? null,
    });

    const receiptImage = await ReceiptImageService.generateReceiptJpgBuffer(orderId);
    const chatIdStr = telegramChatId.toString();

    try {
      const sendResult = await TelegramBotService.sendPhoto(
        telegramConfig.bot_token,
        chatIdStr,
        receiptImage.buffer,
        `🧾 Receipt #${order.receiptNumber}`,
        receiptImage.filename
      );

      await this.persistDelivery(existing, {
        orderId,
        receiptLinkId: options.receiptLinkId ?? null,
        receiptCode: options.receiptCode ?? null,
        telegramChatId,
        status: 'SENT',
        telegramMessageId: BigInt(sendResult.messageId),
        errorCode: null,
        errorMessage: null,
        sentAt: new Date(),
      });

      logger.info('Receipt sent to Telegram successfully', {
        chatHint,
        orderId,
        messageId: sendResult.messageId,
        receiptLinkId: options.receiptLinkId ?? null,
      });

      return { sentNow: true, alreadySent: false };
    } catch (error: any) {
      const errorCode = this.extractErrorCode(error);
      const errorMessage = this.sanitizeErrorMessage(
        error.response?.data?.description || error.message
      );

      logger.error('Failed to send receipt to Telegram', {
        chatHint,
        orderId,
        receiptLinkId: options.receiptLinkId ?? null,
        errorCode,
        errorMessage,
      });

      await this.persistDelivery(existing, {
        orderId,
        receiptLinkId: options.receiptLinkId ?? null,
        receiptCode: options.receiptCode ?? null,
        telegramChatId,
        status: 'FAILED',
        telegramMessageId: null,
        errorCode: errorCode ?? null,
        errorMessage,
        sentAt: null,
      });

      if (errorCode === 403) {
        throw new Error('BOT_BLOCKED');
      }

      throw error;
    }
  }

  private static formatChatHint(chatId: bigint): string {
    const str = chatId.toString();
    if (str.length <= 8) return `chat_${str}`;
    return `chat_...${str.slice(-4)}`;
  }

  private static async findExistingDelivery(
    orderId: number,
    telegramChatId: bigint,
    options: DeliveryKey
  ): Promise<ExistingDelivery | null> {
    const orConditions: Record<string, unknown>[] = [];
    if (
      options.receiptLinkId &&
      (await this.columnExists('receipt_link_id'))
    ) {
      orConditions.push({ receiptLinkId: options.receiptLinkId });
    }
    if (
      options.receiptCode &&
      (await this.columnExists('receipt_code'))
    ) {
      orConditions.push({ receiptCode: options.receiptCode });
    }
    if (orConditions.length === 0) {
      orConditions.push({ orderId });
    }

    const includeTelegramMessageId = await this.columnExists(
      'telegram_message_id'
    );

    const select: Prisma.ReceiptDeliverySelect = {
      id: true,
      status: true,
    };
    if (includeTelegramMessageId) {
      select.telegramMessageId = true;
    }

    const delivery = (await prisma.receiptDelivery.findFirst({
      where: {
        telegramChatId,
        OR: orConditions,
      },
      select,
    })) as ReceiptDeliveryRow | null;

    if (!delivery) {
      return null;
    }

    const status = delivery.status;
    if (status !== 'SENT' && status !== 'FAILED') {
      logger.warn('ReceiptDelivery has unexpected status', {
        orderId,
        telegramChatId,
        status,
      });
      return null;
    }

    const result: ExistingDelivery = {
      id: delivery.id,
      status,
    };
    if (includeTelegramMessageId) {
      result.telegramMessageId = delivery.telegramMessageId ?? null;
    }

    return result;
  }

  private static async persistDelivery(
    existing: ExistingDelivery | null,
    payload: {
      orderId: number;
      receiptLinkId: number | null;
      receiptCode: string | null;
      telegramChatId: bigint;
      status: 'SENT' | 'FAILED';
      telegramMessageId: bigint | null;
      errorCode: number | null;
      errorMessage: string | null;
      sentAt: Date | null;
    }
  ) {
    const now = new Date();
    const data = {
      orderId: payload.orderId,
      receiptLinkId: payload.receiptLinkId,
      receiptCode: payload.receiptCode,
      telegramChatId: payload.telegramChatId,
      status: payload.status,
      telegramMessageId: payload.telegramMessageId,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      sentAt: payload.sentAt,
      lastAttemptAt: now,
      updatedAt: now,
    };

    if (existing) {
      return prisma.receiptDelivery.update({
        where: { id: existing.id },
        data,
      });
    }

    return prisma.receiptDelivery.create({
      data: {
        ...data,
        createdAt: now,
      },
    });
  }

  private static async columnExists(column: string): Promise<boolean> {
    if (this.receiptDeliveryColumnCache[column] !== undefined) {
      return this.receiptDeliveryColumnCache[column] as boolean;
    }

    const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'receipt_deliveries'
          AND column_name = $1
      ) AS exists
      `,
      column
    );

    const exists = Boolean(rows[0]?.exists);
    this.receiptDeliveryColumnCache[column] = exists;
    return exists;
  }

  private static extractErrorCode(error: any): number | null {
    if (typeof error.error_code === 'number') return error.error_code;
    if (error.response?.data?.error_code) return error.response.data.error_code;
    return null;
  }

  private static sanitizeErrorMessage(message: string | null | undefined): string | null {
    if (!message) return null;
    const sanitized = message.replace(/[\r\n]+/g, ' ');
    return sanitized.length > 500 ? `${sanitized.slice(0, 497)}...` : sanitized;
  }
}
