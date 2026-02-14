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
        const { receipt_code } = req.body || {};
        try {
            if (!receipt_code || receipt_code.length < 20) {
                return res.status(400).json({ success: false, message: 'Invalid receipt_code format' });
            }

            // 1. Find receipt to ensure it exists
            const receipt = await prisma.receiptLink.findUnique({
                where: { code: receipt_code },
                select: { receiptLinkId: true, linkStatus: true }
            });

            if (!receipt) {
                return res.status(404).json({ success: false, message: 'Receipt not found' });
            }

            if (receipt.linkStatus === 'EXPIRED') {
                return res.status(400).json({ success: false, message: 'Receipt has expired' });
            }

            // 2. Get bot info to build deep link
            const config = await TelegramService.getTelegramConfig();
            if (!config) throw new Error('Telegram not configured');

            const botInfo = await TelegramBotService.getMe(config.bot_token);
            const telegramLink = `https://t.me/${botInfo.username}?start=RECEIPT_${receipt_code}`;

            return res.json({
                success: true,
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
