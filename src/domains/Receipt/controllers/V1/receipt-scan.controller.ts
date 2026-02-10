import { Request, Response } from 'express';
import prisma from '@src/database/client';
import { logger } from '@src/shared/utils/logger';
import { CustomerLinkingService } from '@src/domains/Customer/services/V1/customer-linking.service';
import { ReceiptDeliveryService } from '@src/domains/Receipt/services/V1/receipt-delivery.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { sanitizeForLog } from '@src/shared/utils/security.utils';

export class ReceiptScanController {
    /**
     * Handle QR scan from Flutter app
     */
    static async scan(req: Request, res: Response) {
        const { receipt_code, device_id } = req.body || {};
        try {

            if (!receipt_code || receipt_code.length < 20) {
                return res.status(400).json({ success: false, message: 'Invalid receipt_code format' });
            }

            // 1. Find receipt and associated order using secure random code
            const receiptLink = await prisma.receiptLink.findUnique({
                where: { code: receipt_code },
                include: { order: true }
            });

            if (!receiptLink) {
                return res.status(404).json({ success: false, message: 'Receipt not found' });
            }

            const orderId = receiptLink.orderId;

            // 2. Identify or Create Customer by device_id
            let customer = await prisma.customer.findUnique({
                where: { deviceId: device_id || 'unknown' }
            });

            if (!customer && device_id) {
                customer = await prisma.customer.create({
                    data: {
                        deviceId: device_id,
                        fullName: `Guest ${device_id.slice(-4)}`
                    }
                });
            }

            // 3. Check if customer is linked to Telegram
            const link = customer ? await prisma.customerTelegramLink.findUnique({
                where: { customerId: customer.customerId }
            }) : null;

            if (link && link.telegramChatId) {
                // Security Check: If the link is already marked as USED by someone else, we should be careful.
                // But since this is an auto-send to the owner, it's generally okay. 
                // However, let's mark it USED if it's still PENDING.

                try {
                    const delivery = await ReceiptDeliveryService.sendReceiptIdempotent(
                        orderId,
                        link.telegramChatId
                    );

                    if (receiptLink.linkStatus === 'PENDING') {
                        await prisma.receiptLink.update({
                            where: { receiptLinkId: receiptLink.receiptLinkId },
                            data: {
                                linkStatus: 'USED',
                                usedAt: new Date(),
                                telegramChatId: link.telegramChatId,
                                telegramUserId: link.telegramUserId
                            }
                        });
                    }

                    return res.json({
                        linked: true,
                        sent: true,
                        alreadySent: delivery.alreadySent,
                        note: delivery.alreadySent ? 'This receipt was already sent to your Telegram.' : undefined
                    });
                } catch (error: any) {
                    if (error.message === 'BOT_BLOCKED') {
                        return res.json({ linked: true, sent: false, error: 'BOT_BLOCKED' });
                    }
                    throw error;
                }
            }

            // 4. Not linked -> Generate deep link
            // If no customer yet (no device_id provided), we might need a temporary customer or just fail
            if (!customer) {
                // Fallback: create an anonymous customer for this scan
                customer = await prisma.customer.create({
                    data: { fullName: 'Anonymous Scanner' }
                });
            }

            const token = await CustomerLinkingService.generateLinkToken({
                customer_id: customer.customerId,
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
