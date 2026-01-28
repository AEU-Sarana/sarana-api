import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { ShiftController } from '@src/domains/Shift/controllers/V1/shift.controller';
import {
  startShiftValidator,
  closeShiftValidator,
  listShiftsValidator,
  getShiftValidator,
  getShiftReconciliationValidator,
} from '@src/domains/Shift/validators/V1/index';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Start shift - All users (role-scoped in service)
router.post(
  '/start',
  ...validateRequest(startShiftValidator),
  ShiftController.startShift
);

// List shifts - All users (Seller: own, Admin: all)
router.get(
  '/',
  ...validateRequest(listShiftsValidator),
  ShiftController.listShifts
);

// Get shift reconciliation - Admin only (MUST be before /:id)
router.get(
  '/:id/reconciliation',
  requireAdmin,
  ...validateRequest(getShiftReconciliationValidator),
  ShiftController.getReconciliation
);

// Get shift details - All users (role-scoped in service)
router.get(
  '/:id',
  ...validateRequest(getShiftValidator),
  ShiftController.getShift
);

// Close shift - All users (role-scoped in service)
router.post(
  '/:id/close',
  ...validateRequest(closeShiftValidator),
  ShiftController.closeShift
);

export default router;
// i need clean code for this file