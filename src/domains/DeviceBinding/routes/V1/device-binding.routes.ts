import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin, requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { DeviceBindingController } from '@src/domains/DeviceBinding/controllers/V1/device-binding.controller';
import {
  listDeviceBindingsValidator,
  getDeviceBindingValidator,
  registerDeviceValidator,
  approveDeviceValidator,
  revokeDeviceValidator,
  removeDeviceValidator,
} from '@src/domains/DeviceBinding/validators/V1';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// List device bindings - Admin only
router.get(
  '/',
  requireAdmin,
  requirePermission(Permission.DEVICE_VIEW),
  ...validateRequest(listDeviceBindingsValidator),
  DeviceBindingController.listDeviceBindings
);

// Get device binding details - Admin only
router.get(
  '/:id',
  requireAdmin,
  requirePermission(Permission.DEVICE_VIEW),
  ...validateRequest(getDeviceBindingValidator),
  DeviceBindingController.getDeviceBinding
);

// Register device binding - All users (typically called during login)
router.post(
  '/',
  ...validateRequest(registerDeviceValidator),
  DeviceBindingController.registerDevice
);

// Approve device - Admin only
router.put(
  '/:id/approve',
  requireAdmin,
  requirePermission(Permission.DEVICE_APPROVE),
  ...validateRequest(approveDeviceValidator),
  DeviceBindingController.approveDevice
);

// Revoke device - Admin only
router.put(
  '/:id/revoke',
  requireAdmin,
  requirePermission(Permission.DEVICE_REVOKE),
  ...validateRequest(revokeDeviceValidator),
  DeviceBindingController.revokeDevice
);

// Remove device binding - Admin only
router.delete(
  '/:id',
  requireAdmin,
  requirePermission(Permission.DEVICE_REVOKE),
  ...validateRequest(removeDeviceValidator),
  DeviceBindingController.removeDevice
);

export default router;