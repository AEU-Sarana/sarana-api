import prisma from '@src/database/client';
import { logger } from '@src/shared/utils/logger';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { ReceiptImageService } from '@src/domains/Receipt/services/V1/receipt-image.service';

export class ReceiptDeliveryService {
    /**
     * Send receipt to a specific Telegram chat if not already sent.
     */
    static async sendReceiptIdempotent(orderId: number, telegramChatId: bigint): Promise<{ sent: boolean; alreadySent: boolean }> {
        // 1. Check if already delivered successfully
        const existing = await prisma.receiptDelivery.findFirst({
            where: {
                orderId,
                telegramChatId,
                status: 'SENT',
            },
        });

        if (existing) {
            logger.info('Receipt already delivered to this chat', {
                orderId,
                telegramChatId: telegramChatId.toString().slice(0, 4) + '***'
            });
            return { sent: true, alreadySent: true };
        }

        logger.info('Sending receipt to Telegram', {
            orderId,
            telegramChatId: telegramChatId.toString().slice(0, 4) + '***'
        });

        // 2. Prepare receipt
        const order = await prisma.order.findUnique({
            where: { orderId },
            select: { receiptNumber: true },
        });
        if (!order) throw new Error('Order not found');

        const receiptImage = await ReceiptImageService.generateReceiptJpg(orderId);
        const telegramConfig = await TelegramService.getTelegramConfig();
        if (!telegramConfig) throw new Error('Telegram not configured');

        const chatIdStr = telegramChatId.toString();

        try {
            // 3. Send via Telegram
            await TelegramBotService.sendPhoto(
                telegramConfig.bot_token,
                chatIdStr,
                receiptImage.url,
                `🧾 Receipt #${order.receiptNumber}`
            );

            // 4. Record success
            await prisma.receiptDelivery.upsert({
                where: {
                    orderId_telegramChatId: {
                        orderId,
                        telegramChatId,
                    },
                },
                update: {
                    status: 'SENT',
                    sentAt: new Date(),
                },
                create: {
                    orderId,
                    telegramChatId,
                    status: 'SENT',
                },
            });

            return { sent: true, alreadySent: false };
        } catch (error: any) {
            logger.error('Failed to send receipt to Telegram', { error: error.message, orderId, telegramChatId });

            // Record failure
            await prisma.receiptDelivery.upsert({
                where: {
                    orderId_telegramChatId: {
                        orderId,
                        telegramChatId,
                    },
                },
                update: {
                    status: 'FAILED',
                },
                create: {
                    orderId,
                    telegramChatId,
                    status: 'FAILED',
                },
            });

            if (error.error_code === 403) {
                throw new Error('BOT_BLOCKED');
            }
            throw error;
        }
    }
}
