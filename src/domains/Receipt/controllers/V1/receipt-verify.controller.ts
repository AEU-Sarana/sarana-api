import { Request, Response } from 'express';
import { logger } from '@src/shared/utils/logger';
import { sanitizeForLog } from '@src/shared/utils/security.utils';
import { ReceiptImageService } from '@src/domains/Receipt/services/V1/receipt-image.service';
import { decodeQrPayload, isHighEntropyCode, verifyReceiptSignature } from '@src/domains/Receipt/services/V1/receipt-qr.service';
import type { ReceiptQrPayload } from '@src/domains/Receipt/types/receipt-qr.types';

export class ReceiptVerifyController {
  static async verify(req: Request, res: Response) {
    try {
      const { qr, payload, signature } = req.body || {};

      let qrPayload: ReceiptQrPayload;
      let sig: string;

      if (qr) {
        const decoded = decodeQrPayload(qr);
        qrPayload = decoded.payload;
        sig = decoded.signature;
      } else {
        qrPayload = payload as ReceiptQrPayload;
        sig = signature as string;
      }

      if (!qrPayload || !sig) {
        return res.status(400).json({ success: false, message: 'Invalid request' });
      }

      if (!isHighEntropyCode(qrPayload.receipt_code)) {
        return res.status(400).json({ success: false, message: 'Invalid receipt_code format' });
      }

      if (!verifyReceiptSignature(qrPayload, sig)) {
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }

      const receiptImage = await ReceiptImageService.generateReceiptJpgFromPayload(qrPayload);

      return res.json({
        success: true,
        verified: true,
        receipt_number: qrPayload.receipt_number,
        total_amount: qrPayload.total_amount,
        receipt_image_url: receiptImage.url,
      });
    } catch (error: any) {
      logger.error('Receipt verify error', sanitizeForLog({
        message: error.message,
        stack: error.stack,
      }));
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
