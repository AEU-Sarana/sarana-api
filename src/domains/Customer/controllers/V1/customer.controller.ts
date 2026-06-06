import { Request, Response } from 'express';
import { CustomerService } from '../../services/V1/customer.service';
import { ListCustomersRequest } from '../../types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

export class CustomerController {
  /**
   * GET /api/v1/customers
   * List customers with pagination, search, and telegram link status filtering.
   */
  static async listCustomers(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      
      const request: ListCustomersRequest = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        search: req.query.search as string,
        telegramFilter: (req.query.telegramFilter as any) || 'all',
      };

      const response = await CustomerService.listCustomers(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Customers retrieved successfully',
      });
    } catch (error: any) {
      logger.error('List customers error', { error: error.message });
      throw error; // Let error handler middleware handle it
    }
  }
}
