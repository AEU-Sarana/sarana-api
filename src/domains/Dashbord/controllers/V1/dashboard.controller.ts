import { Request, Response } from 'express';
import { DashboardService } from '@src/domains/Dashbord/services/dashboard.service';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

export class DashboardController {
  /**
   * GET /api/v1/dashboard/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const response = await DashboardService.getOverview(user.userId, user.role as any);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Dashboard overview retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get dashboard overview error', { error: error.message });
      throw error;
    }
  }

  /**
   * GET /api/v1/dashboard/top-products
   */
  static async getTopProducts(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 5;
      const sortBy = (req.query.sortBy as 'quantity' | 'revenue') || 'quantity';

      const topProducts = await DashboardService.getTopProducts(limit, sortBy);

      res.status(200).json({
        success: true,
        data: topProducts,
        message: 'Top selling products retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get top products error', { error: error.message });
      throw error;
    }
  }
}
