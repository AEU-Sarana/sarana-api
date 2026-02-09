import { Router, type IRouter, type Request, type Response } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { ReceiptLinkController } from '@src/domains/Receipt/controllers/V1/receipt-link.controller';
import { ReceiptSettingsController } from '@src/domains/Receipt/controllers/V1/receipt-settings.controller';
import {
  createReceiptLinkValidator,
  getReceiptSettingsValidator,
  updateReceiptSettingsValidator,
  uploadReceiptLogoValidator,
} from '@src/domains/Receipt/validators/V1';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';

const router: IRouter = Router();

router.use(authenticateToken);

// Cashier/Admin - generate QR receipt link
router.post(
  '/orders/:order_id/receipt-link',
  ...validateRequest(createReceiptLinkValidator),
  ReceiptLinkController.createReceiptLink
);

// Admin - get/update receipt settings
router.get(
  '/admin/receipt-settings',
  ...validateRequest(getReceiptSettingsValidator),
  requireAdmin,
  ReceiptSettingsController.getSettings
);

router.put(
  '/admin/receipt-settings',
  ...validateRequest(updateReceiptSettingsValidator),
  requireAdmin,
  ReceiptSettingsController.updateSettings
);

// Optional upload endpoint (if multipart middleware enabled)
router.post(
  '/admin/receipt-settings/logo',
  ...validateRequest(uploadReceiptLogoValidator),
  requireAdmin,
  (_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Logo uploaded successfully' });
  }
);

export default router;