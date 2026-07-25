import { Router, type IRouter } from 'express';
import { PermissionController } from '../../controllers/V1/permission.controller';
import { authenticateToken, requireAdmin } from '@src/shared/middleware/auth.middleware';

const router: IRouter = Router();

// GET /api/v1/permissions/features — Master features list
router.get(
  '/permissions/features',
  authenticateToken,
  PermissionController.getSystemFeatures
);

// GET /api/v1/users/:id/permissions — Get user's permissions
router.get(
  '/users/:id/permissions',
  authenticateToken,
  requireAdmin,
  PermissionController.getUserPermissions
);

// PUT /api/v1/users/:id/permissions — Update user's permissions
router.put(
  '/users/:id/permissions',
  authenticateToken,
  requireAdmin,
  PermissionController.updateUserPermissions
);

export default router;
