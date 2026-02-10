import { Router, type IRouter } from 'express';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { TelegramReceiptController } from '@src/domains/Receipt/controllers/V1/telegram-receipt.controller';
import { ReceiptScanController } from '@src/domains/Receipt/controllers/V1/receipt-scan.controller';
import { claimReceiptValidator } from '@src/domains/Receipt/validators/V1/claim-receipt.validator';
import { scanReceiptValidator } from '@src/domains/Receipt/validators/V1/scan-receipt.validator';

import { receiptScanRateLimiter } from '@src/shared/middleware/rate-limit.middleware';

const router: IRouter = Router();

router.post(
  '/telegram/receipts/claim',
  receiptScanRateLimiter,
  ...validateRequest(claimReceiptValidator),
  TelegramReceiptController.claimReceipt
);

router.post(
  '/scan',
  receiptScanRateLimiter,
  ...validateRequest(scanReceiptValidator),
  ReceiptScanController.scan
);

export default router;