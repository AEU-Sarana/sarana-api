import prisma from '@src/database/client';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { buildOrderSyncMessage } from '@src/domains/TelegramAdminBot/templates/order-sync.template';
import { logger } from '@src/shared/utils/logger';
import { SyncOrdersRequest } from '@src/domains/Order/types/order.types';

type OrderSyncPayload = SyncOrdersRequest['orders'][number];

type NotifyOrderSyncInput = {
  order: OrderSyncPayload;
  status: 'synced' | 'updated';
  orderId?: number;
  fallbackSellerId: number;
  orderDate: Date;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export class TelegramAdminOrderNotifyService {
  static async notifyOrderSyncSuccess(input: NotifyOrderSyncInput): Promise<void> {
    const { order, status, orderId, fallbackSellerId, orderDate } = input;

    const sellerId = order.seller_id ?? fallbackSellerId;
    const seller = await prisma.user.findUnique({
      where: { userId: sellerId },
      select: { fullName: true },
    });

    const tenantId = 1;

    const chatIds = await this.resolveTargetChatIds();
    if (!chatIds.length) return;

    const message = buildOrderSyncMessage({
      order_uuid: order.order_uuid,
      receipt_number: order.receipt_number,
      order_date: orderDate,
      shift_id: 0,
      seller_id: sellerId,
      seller_name: seller?.fullName ?? null,
      payment_method: order.payment_method,
      total_amount: order.total_amount,
      discount_amount: order.discount_amount,
      tax_amount: order.tax_amount,
      service_fee: order.service_fee,
      status,
      order_id: orderId,
      items: order.items,
    });

    for (const chatId of chatIds) {
      try {
        await TelegramService.sendMessageByChatId(tenantId, chatId, message, 'Markdown');
      } catch (error: unknown) {
        logger.error('Failed to send order sync message to Telegram admin', {
          tenantId,
          error: getErrorMessage(error),
          chatId,
          order_uuid: order.order_uuid,
        });
      }
    }
  }

  private static async resolveTargetChatIds(): Promise<Array<number | string>> {
    const chatLinks = await prisma.telegramAdminLink.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: { chatId: true },
    });

    const ids = new Set<number | string>();
    for (const link of chatLinks) {
      if (link.chatId === null || link.chatId === undefined) continue;
      ids.add(String(link.chatId));
    }

    // Fallback: if no admin links exist yet, send to configured Telegram group chat (if any).
    if (ids.size === 0) {
      try {
        const config = await TelegramService.getTelegramConfig();
        if (config?.group_chat_id) {
          ids.add(String(config.group_chat_id));
        }
      } catch (error: unknown) {
        logger.warn('Telegram config not available for fallback chat', {
          error: getErrorMessage(error),
        });
      }
    }

    return Array.from(ids);
  }
}
