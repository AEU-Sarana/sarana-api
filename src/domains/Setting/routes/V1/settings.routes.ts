import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin, requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { SettingsController } from '@src/domains/Setting/controllers/V1/settings.controller';
import { updateSettingsValidator } from '@src/domains/Setting/validators/V1';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Get settings - Admin only
router.get(
  '/',
  requireAdmin,
  requirePermission(Permission.SETTINGS_VIEW),
  SettingsController.getSettings
);

// Update settings - Admin only
router.put(
  '/',
  requireAdmin,
  requirePermission(Permission.SETTINGS_UPDATE),
  ...validateRequest(updateSettingsValidator),
  SettingsController.updateSettings
);

export default router;
