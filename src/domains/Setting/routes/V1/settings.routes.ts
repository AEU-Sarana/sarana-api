import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdministrator, requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { SettingsController } from '@src/domains/Setting/controllers/V1/settings.controller';
import { updateSettingsValidator } from '@src/domains/Setting/validators/V1';
import { productImageUploadAny } from '@src/shared/utils/multer.config';
import { ReceiptSettingsController } from '@src/domains/Receipt/controllers/V1/receipt-settings.controller';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Get settings - Administrator only
router.get(
  '/',
  requireAdministrator,
  requirePermission(Permission.SETTINGS_VIEW),
  SettingsController.getSettings
);

// Update settings - Administrator only
router.put(
  '/',
  requireAdministrator,
  requirePermission(Permission.SETTINGS_UPDATE),
  ...validateRequest(updateSettingsValidator),
  SettingsController.updateSettings
);

// Upload store logo - Administrator only
router.post(
  '/logo',
  requireAdministrator,
  requirePermission(Permission.SETTINGS_UPDATE),
  productImageUploadAny,
  ReceiptSettingsController.uploadLogo
);

export default router;
