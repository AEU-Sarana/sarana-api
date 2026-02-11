import { Request, Response } from 'express';
import prisma from '@src/database/client';
import { logger } from '@src/shared/utils/logger';
import { CustomerLinkingService } from '@src/domains/Customer/services/V1/customer-linking.service';
import { ReceiptDeliveryService } from '@src/domains/Receipt/services/V1/receipt-delivery.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { sanitizeForLog } from '@src/shared/utils/security.utils';
import { getReceiptScanQueue } from '@src/domains/Receipt/queues/receipt-scan.queue';

export class ReceiptScanController {
    /**
     * Handle QR scan from Flutter app
     */
    static async scan(req: Request, res: Response) {
        const { receipt_code, device_id } = req.body || {};
        try {

            if (device_id) {
                return res.status(400).json({ success: false, message: 'device_id is not allowed' });
            }

            if (!receipt_code || receipt_code.length < 20) {
                return res.status(400).json({ success: false, message: 'Invalid receipt_code format' });
            }

            if (/^RCP-/i.test(receipt_code)) {
                return res.status(400).json({ success: false, message: 'Invalid receipt_code format' });
            }

            // 1. Find receipt and associated order using secure random code
            const receiptRows = await prisma.$queryRawUnsafe<{
                receipt_link_id: number;
                order_id: number;
                code: string;
                link_status: string;
                customer_id: number | null;
            }[]>(
                `
                SELECT receipt_link_id, order_id, code, link_status, customer_id
                FROM receipt_links
                WHERE code = $1
                LIMIT 1
                `,
                receipt_code
            );
            const receiptLink = receiptRows[0];

            if (!receiptLink) {
                return res.status(404).json({ success: false, message: 'Receipt not found' });
            }

            const orderId = receiptLink.order_id;

            // 2. Identify or Create Customer by receipt_link.customer_id
            let customerId = receiptLink.customer_id;
            if (!customerId) {
                const customer = await prisma.customer.create({
                    data: { fullName: 'Guest' }
                });
                customerId = customer.customerId;
                await prisma.$executeRawUnsafe(
                    `
                    UPDATE receipt_links
                    SET customer_id = $1
                    WHERE receipt_link_id = $2
                    `,
                    customerId,
                    receiptLink.receipt_link_id
                );
            }

            // 3. Check if customer is linked to Telegram
            const link = await prisma.customerTelegramLink.findUnique({
                where: { customerId: customerId }
            });

            if (link && link.telegramChatId) {
                const existing = await ReceiptDeliveryService.getExistingDelivery(orderId, link.telegramChatId, {
                    receiptLinkId: receiptLink.receipt_link_id,
                    receiptCode: receiptLink.code,
                });

                if (existing?.status === 'SENT' && existing.telegramMessageId != null) {
                    return res.json({
                        linked: true,
                        sent: true,
                        sentNow: false,
                        alreadySent: true
                    });
                }

                const queue = getReceiptScanQueue();
                await queue.add('send-receipt', {
                    orderId,
                    receiptLinkId: receiptLink.receipt_link_id,
                    receiptCode: receiptLink.code,
                    telegramChatId: link.telegramChatId.toString(),
                    telegramUserId: link.telegramUserId ? link.telegramUserId.toString() : null,
                    linkStatus: receiptLink.link_status
                });

                return res.json({
                    linked: true,
                    sent: false,
                    queued: true
                });
            }

            const token = await CustomerLinkingService.generateLinkToken({
                customer_id: customerId,
                receipt_code
            });

            const config = await TelegramService.getTelegramConfig();
            if (!config) throw new Error('Telegram not configured');

            const botInfo = await TelegramBotService.getMe(config.bot_token);
            const telegramLink = `https://t.me/${botInfo.username}?start=LINK_${token}`;

            return res.json({
                linked: false,
                sent: false,
                telegram_link: telegramLink
            });

        } catch (error: any) {
            logger.error('Receipt scan error', sanitizeForLog({
                message: error.message,
                stack: error.stack,
                receipt_code
            }));
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
