
import { Router , type IRouter} from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin, requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { UserController } from '@src/domains/User/controllers/V1/user.controller';
import {
  listUsersValidator,
  listCashiersValidator,
  getUserValidator,
  createUserValidator,
  updateUserValidator,
  deactivateUserValidator,
} from '@src/domains/User/validators/V1';
import { createPinValidator } from '../../validators/V1/create-pin.validator';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// All routes require admin
router.use(requireAdmin);

// List users
router.get(
  '/',
  requirePermission(Permission.USER_VIEW),
  ...validateRequest(listUsersValidator),
  UserController.listUsers
);

// List cashiers only
router.get(
  '/cashiers',
  requirePermission(Permission.USER_VIEW),
  ...validateRequest(listCashiersValidator),
  UserController.listCashiers
);

// Get user details
router.get(
  '/:id',
  requirePermission(Permission.USER_VIEW),
  ...validateRequest(getUserValidator),
  UserController.getUser
);

// Create user/cashier
router.post(
  '/',
  requirePermission(Permission.USER_CREATE),
  ...validateRequest(createUserValidator),
  UserController.createUser
);

// Update user/cashier
router.put(
  '/:id',
  requirePermission(Permission.USER_UPDATE),
  ...validateRequest(updateUserValidator),
  UserController.updateUser
);

// Deactivate user (soft delete)
router.delete(
  '/:id',
  requirePermission(Permission.USER_DELETE),
  ...validateRequest(deactivateUserValidator),
  UserController.deactivateUser
);

//Set user PIN
router.put(
  '/:id/pin',
  requirePermission(Permission.USER_UPDATE),
  ...validateRequest(createPinValidator),
  UserController.setUserPIN
);

export default router;