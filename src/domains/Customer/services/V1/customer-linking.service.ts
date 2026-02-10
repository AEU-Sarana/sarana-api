import prisma from '@src/database/client';
import { logger } from '@src/shared/utils/logger';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { ReceiptDeliveryService } from '@src/domains/Receipt/services/V1/receipt-delivery.service';
import crypto from 'crypto';

export class CustomerLinkingService {
    /**
     * Generate a short linking token (max 64 chars for Telegram deep link)
     */
    static async generateLinkToken(payload: { customer_id: number; receipt_code?: string }): Promise<string> {
        // 1. Cleanup expired tokens and old tokens for this customer (Security & DB Health)
        await prisma.customerLinkingToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { customerId: payload.customer_id }
                ]
            }
        });

        const token = crypto.randomBytes(24).toString('base64url');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.customerLinkingToken.create({
            data: {
                token,
                customerId: payload.customer_id,
                receiptCode: payload.receipt_code,
                expiresAt,
            },
        });

        return token;
    }

    /**
     * Handle customer linking from deep link token
     */
    static async handleCustomerLink(token: string, telegramUserId: number, telegramChatId: number, username?: string) {
        // 1. Find and validate token
        const storedToken = await prisma.customerLinkingToken.findUnique({
            where: { token },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            logger.error('Invalid or expired linking token');
            throw new Error('Invalid or expired linking token');
        }

        const customerId = storedToken.customerId;

        // 2. Security Check: Ensure this Telegram account is not already linked to another customer
        const existingLink = await prisma.customerTelegramLink.findFirst({
            where: {
                telegramChatId: BigInt(telegramChatId),
                NOT: { customerId }
            }
        });

        if (existingLink) {
            logger.info('Transferring telegram link to new customer', {
                oldCustomerId: existingLink.customerId,
                newCustomerId: customerId
            });
            await prisma.customerTelegramLink.delete({ where: { id: existingLink.id } });
        }

        // 3. Upsert mapping in DB
        const link = await prisma.customerTelegramLink.upsert({
            where: { customerId },
            update: {
                telegramChatId: BigInt(telegramChatId),
                telegramUserId: BigInt(telegramUserId),
                updatedAt: new Date(),
            },
            create: {
                customerId,
                telegramChatId: BigInt(telegramChatId),
                telegramUserId: BigInt(telegramUserId),
            },
        });

        // 3. Cleanup token
        await prisma.customerLinkingToken.delete({ where: { token } });

        // 4. Send Confirmation & Receipt
        // 5. Send Confirmation & Receipt
        const telegramConfig = await TelegramService.getTelegramConfig();
        if (telegramConfig) {
            await TelegramBotService.sendMessage(
                telegramConfig.bot_token,
                telegramChatId.toString(),
                '✅ ភ្ជាប់គណនីជោគជ័យ! អ្នកនឹងទទួលបានវិក្កយបត្រស្វ័យប្រវត្តិតាមរយៈ Telegram នេះនៅពេលស្កេនលើកក្រោយ។',
                'Markdown'
            );

            if (storedToken.receiptCode) {
                try {
                    let orderId: number | null = null;
                    let linkId: number | null = null;
                    const rLink = await prisma.receiptLink.findUnique({
                        where: { code: storedToken.receiptCode },
                        select: { orderId: true, receiptLinkId: true }
                    });

                    if (rLink) {
                        orderId = rLink.orderId;
                        linkId = rLink.receiptLinkId;
                    }

                    if (orderId) {
                        await ReceiptDeliveryService.sendReceiptIdempotent(orderId, BigInt(telegramChatId), {
                            receiptLinkId: linkId ?? undefined,
                            receiptCode: storedToken.receiptCode
                        });
                    }
                } catch (err: any) {
                    logger.error('Failed to auto-send receipt after linking', { error: err.message });
                }
            }
        }

        return link;
    }
}
