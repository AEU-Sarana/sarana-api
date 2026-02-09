import { Request, Response } from 'express';
import { ReceiptLinkService } from '@src/domains/Receipt/services/V1/receipt-link.service';
import { ReceiptRenderService } from '@src/domains/Receipt/services/V1/receipt-render.service';
import { logger } from '@src/shared/utils/logger';

export class TelegramReceiptController {
  static async claimReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { code, telegram_user_id, telegram_chat_id, telegram_username } = req.body;

      const claim = await ReceiptLinkService.claimReceipt({
        code,
        telegram_user_id,
        telegram_chat_id,
        telegram_username,
      });

      const receipt_text = await ReceiptRenderService.renderReceiptText(claim.order_id);

      res.status(200).json({
        success: true,
        data: {
          ...claim,
          receipt_text,
        },
        message: 'Receipt claimed successfully',
      });
    } catch (error: any) {
      logger.error('Claim receipt error', { error: error.message });
      throw error;
    }
  }
}