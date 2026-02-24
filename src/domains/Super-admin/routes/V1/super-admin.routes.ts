import { Router } from 'express';
import { SuperAdminController } from '../../controllers/V1/super-admin.controller';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireRole } from '@src/shared/middleware/authorization.middleware';
import { Role } from '@src/shared/config/permissions';
import { dashboardSummaryValidator, userGrowthValidator, tenantListValidator, createTenantValidator, closeSubscriptionValidator } from '../../validators/V1';
import { validateRequest } from '@src/shared/middleware/validation.middleware';

const router = Router();

// Apply authentication & authorization to all SuperAdmin routes
router.use(authenticateToken);
router.use(requireRole(Role.SUPER_ADMIN));

// Dashboard Routes
router.get(
    '/dashboard/summary',
    ...validateRequest(dashboardSummaryValidator),
    SuperAdminController.getSummary
);

router.get(
    '/dashboard/user-growth',
    ...validateRequest(userGrowthValidator),
    SuperAdminController.getUserGrowth
);

// Tenant Routes
router.get(
    '/tenants',
    ...validateRequest(tenantListValidator),
    SuperAdminController.listTenants
);

router.post(
    '/tenants',
    ...validateRequest(createTenantValidator),
    SuperAdminController.createTenant
);

// Subscription Routes
router.post(
    '/subscriptions/:id/close',
    ...validateRequest(closeSubscriptionValidator),
    SuperAdminController.closeSubscription
);



export default router;
