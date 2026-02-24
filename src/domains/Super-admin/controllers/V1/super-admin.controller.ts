import { Request, Response } from 'express';
import { SuperAdminService } from '../../services/super-admin.service';
import { logger } from '@src/shared/utils/logger';
import { GroupByType } from '../../enums/V1';

export class SuperAdminController {
    /**
     * GET /api/v1/super-admin/dashboard/summary
     */
    static async getSummary(req: Request, res: Response): Promise<void> {
        try {
            const { period } = req.query as { period: string };
            const data = await SuperAdminService.getDashboardSummary(period);

            res.status(200).json({
                success: true,
                data,
                message: 'Dashboard summary retrieved successfully',
            });
        } catch (error: any) {
            logger.error('Get dashboard summary error', { error: error.message });
            throw error;
        }
    }

    /**
     * GET /api/v1/super-admin/dashboard/user-growth
     */
    static async getUserGrowth(req: Request, res: Response): Promise<void> {
        try {
            const { group_by, year } = req.query as { group_by?: GroupByType, year?: string };
            const effectiveGroupBy = group_by || GroupByType.MONTH;
            const data = await SuperAdminService.getUserGrowth(effectiveGroupBy, year ? Number(year) : undefined);

            res.status(200).json({
                success: true,
                data,
                message: `${effectiveGroupBy.charAt(0).toUpperCase() + effectiveGroupBy.slice(1)}ly user growth data retrieved successfully`,
            });
        } catch (error: any) {
            logger.error('Get user growth error', { error: error.message });
            throw error;
        }
    }

    /**
     * GET /api/v1/super-admin/tenants
     */
    static async listTenants(req: Request, res: Response): Promise<void> {
        try {
            const data = await SuperAdminService.listTenants(req.query);

            res.status(200).json({
                success: true,
                data,
                message: 'Tenants retrieved successfully',
            });
        } catch (error: any) {
            logger.error('List tenants error', { error: error.message });
            throw error;
        }
    }

    /**
     * POST /api/v1/super-admin/tenants
     */
    static async createTenant(req: Request, res: Response): Promise<void> {
        try {
            const data = await SuperAdminService.createTenant(req.body);

            res.status(201).json({
                success: true,
                data,
                message: 'Tenant created successfully',
            });
        } catch (error: any) {
            logger.error('Create tenant error', { error: error.message });
            throw error;
        }
    }

    /**
     * POST /api/v1/super-admin/subscriptions/:id/close
     */
    static async closeSubscription(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const data = await SuperAdminService.closeSubscription(Number(id), req.body);

            res.status(200).json({
                success: true,
                data: {
                    status: data.status,
                    effective_close_date: data.effectiveCloseDate,
                },
                message: 'Subscription closed successfully',
            });
        } catch (error: any) {
            logger.error('Close subscription error', { error: error.message });
            throw error;
        }
    }
}
