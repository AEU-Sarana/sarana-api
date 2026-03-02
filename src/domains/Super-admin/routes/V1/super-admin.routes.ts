import { Router } from 'express';
import { SuperAdminController } from '../../controllers/V1/super-admin.controller';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireSuperAdmin } from '@src/shared/middleware/authorization.middleware';
import { dashboardSummaryValidator, userGrowthValidator, tenantListValidator, createTenantValidator, closeSubscriptionValidator, createPackageValidator, createPlanValidator, upgradePlanValidator, renewSubscriptionValidator, updateTenantValidator } from '../../validators/V1';

import { validateRequest } from '@src/shared/middleware/validation.middleware';

const router = Router();

// Apply authentication & authorization to all SuperAdmin routes
router.use(authenticateToken);
router.use(requireSuperAdmin);

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

router.get(
    '/tenants/:id',
    SuperAdminController.getTenantById
);

router.patch(
    '/tenants/:id/toggle-status',
    SuperAdminController.toggleTenantStatus
);

router.patch(
    '/tenants/:id',
    ...validateRequest(updateTenantValidator),
    SuperAdminController.updateTenant
);

router.post(
    '/tenants',
    ...validateRequest(createTenantValidator),
    SuperAdminController.createTenant
);

// Subscription Routes
router.get(
    '/subscriptions',
    SuperAdminController.listSubscriptions
);

router.post(
    '/subscriptions/:id/close',
    ...validateRequest(closeSubscriptionValidator),
    SuperAdminController.closeSubscription
);

router.post(
    '/subscriptions/:id/upgrade-plan',
    ...validateRequest(upgradePlanValidator),
    SuperAdminController.upgradePlan
);

router.post(
    '/subscriptions/:id/renew',
    ...validateRequest(renewSubscriptionValidator),
    SuperAdminController.renewSubscription
);

// SaaS Routes
router.get(
    '/saas/packages',
    SuperAdminController.listPackages
);

router.get(
    '/saas/packages/:id',
    SuperAdminController.getPackageById
);

router.get(
    '/saas/plans',
    SuperAdminController.listPlans
);

router.get(
    '/saas/payments',
    SuperAdminController.listPayments
);

router.post(
    '/saas/packages',
    ...validateRequest(createPackageValidator),
    SuperAdminController.createPackage
);

router.post(
    '/saas/plans',
    ...validateRequest(createPlanValidator),
    SuperAdminController.createPlan
);



export default router;
