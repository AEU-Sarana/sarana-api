import { Router } from 'express';
import { ShiftController } from '@src/domains/Shift/controllers/V1/shift.controller';
import {
  closeShiftValidator,
  getShiftReconciliationValidator,
  getShiftValidator,
  listShiftsValidator,
  startShiftValidator,
} from '@src/domains/Shift/validators/V1/index';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Start shift
router.post(
  '/start',
  ...validateRequest(startShiftValidator),
  ShiftController.startShift
);

// List shifts
router.get(
  '/',
  ...validateRequest(listShiftsValidator),
  ShiftController.listShifts
);

// Get shift reconciliation (Admin only)
router.get(
  '/:id/reconciliation',
  requireAdmin,
  ...validateRequest(getShiftReconciliationValidator),
  ShiftController.getReconciliation
);

// Get shift details
router.get(
  '/:id',
  ...validateRequest(getShiftValidator),
  ShiftController.getShift
);

// Close shift
router.post(
  '/:id/close',
  ...validateRequest(closeShiftValidator),
  ShiftController.closeShift
);

export default router;