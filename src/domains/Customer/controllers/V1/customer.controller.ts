import { Request, Response } from 'express';
import { CustomerService } from '../../services/V1/customer.service';
import { ListCustomersRequest, CreateCustomerPayload, UpdateCustomerPayload } from '../../types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

export class CustomerController {
  /**
   * GET /api/v1/customers
   * List customers with pagination, search, and calculated metrics.
   */
  static async listCustomers(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const searchParam = req.query.search as string | undefined;
      const search = searchParam && searchParam !== 'undefined' && searchParam.trim() ? searchParam.trim() : undefined;
      
      const request: ListCustomersRequest = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        search,
      };

      const response = await CustomerService.listCustomers(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Customers retrieved successfully',
      });
    } catch (error: any) {
      logger.error('List customers error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/customers
   * Create a new customer
   */
  static async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const payload: CreateCustomerPayload = req.body;

      const customer = await CustomerService.createCustomer(payload, user.userId);

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
      });
    } catch (error: any) {
      logger.error('Create customer error', { error: error.message });
      throw error;
    }
  }

  /**
   * GET /api/v1/customers/:id
   * Get single customer details with order timeline and payment history
   */
  static async getCustomerDetails(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.id as string, 10);
      const customer = await CustomerService.getCustomerDetails(customerId);

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer details retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get customer details error', { error: error.message });
      throw error;
    }
  }

  /**
   * PUT /api/v1/customers/:id
   * Update existing customer
   */
  static async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const customerId = parseInt(req.params.id as string, 10);
      const payload: UpdateCustomerPayload = req.body;

      const updated = await CustomerService.updateCustomer(customerId, payload, user.userId);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Customer updated successfully',
      });
    } catch (error: any) {
      logger.error('Update customer error', { error: error.message });
      throw error;
    }
  }
}
