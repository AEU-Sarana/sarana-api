import { Router, type IRouter } from 'express';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { TelegramReceiptController } from '@src/domains/Receipt/controllers/V1/telegram-receipt.controller';
import { claimReceiptValidator } from '@src/domains/Receipt/validators/V1/claim-receipt.validator';

const router: IRouter = Router();


router.post(
  '/telegram/receipts/claim',
  ...validateRequest(claimReceiptValidator),
  TelegramReceiptController.claimReceipt
);

export default router;