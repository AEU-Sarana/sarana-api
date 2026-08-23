import { Request, Response } from 'express';
import prisma from '@src/database/client';
import { logger } from '@src/shared/utils/logger';
import { sanitizeForLog } from '@src/shared/utils/security.utils';

export class ReceiptScanController {
    /**
     * Handle QR scan from app
     */
    static async scan(req: Request, res: Response) {
        const { receipt_code } = req.body || {};
        try {
            if (!receipt_code || receipt_code.length < 20) {
                return res.status(400).json({ success: false, message: 'Invalid receipt_code format' });
            }

            // Find receipt to ensure it exists
            const receipt = await prisma.receiptLink.findUnique({
                where: { code: receipt_code }
            });

            if (!receipt) {
                return res.status(404).json({ success: false, message: 'Receipt not found' });
            }

            if (receipt.linkStatus === 'EXPIRED') {
                return res.status(400).json({ success: false, message: 'Receipt has expired' });
            }

            return res.json({
                success: true,
                message: 'Receipt verified successfully',
                receipt
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
