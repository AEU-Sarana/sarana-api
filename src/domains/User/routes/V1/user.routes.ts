
import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
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

// List users
router.get(
  '/',
  requirePermission('users.manage', 'read'),
  ...validateRequest(listUsersValidator),
  UserController.listUsers
);

// List cashiers only
router.get(
  '/cashiers',
  requirePermission('users.manage', 'read'),
  ...validateRequest(listCashiersValidator),
  UserController.listCashiers
);

// Get user details
router.get(
  '/:id',
  requirePermission('users.manage', 'read'),
  ...validateRequest(getUserValidator),
  UserController.getUser
);

// Create user/cashier
router.post(
  '/',
  requirePermission('users.manage', 'create'),
  ...validateRequest(createUserValidator),
  UserController.createUser
);

// Update user/cashier
router.put(
  '/:id',
  requirePermission('users.manage', 'update'),
  ...validateRequest(updateUserValidator),
  UserController.updateUser
);

// Deactivate user (soft delete)
router.delete(
  '/:id',
  requirePermission('users.manage', 'delete'),
  ...validateRequest(deactivateUserValidator),
  UserController.deactivateUser
);

// Set user PIN
router.put(
  '/:id/pin',
  requirePermission('users.manage', 'update'),
  ...validateRequest(createPinValidator),
  UserController.setUserPIN
);

export default router;