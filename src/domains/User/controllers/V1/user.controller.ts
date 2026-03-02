import { Request, Response } from 'express';
import { UserService } from '@src/domains/User/services/user.service';
import {
  ListUsersRequest,
  CreateUserRequest,
  UpdateUserRequest,
} from '@src/domains/User/types/user.types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { UserStatus } from '@src/domains/User/enums';
import { logger } from '@src/shared/utils/logger';

export class UserController {
  /**
   * GET /api/v1/users
   * List users with filters
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request: ListUsersRequest = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        role: req.query.role as string,
        status: req.query.status as string,
        search: req.query.search as string,
      };

      const response = await UserService.listUsers(request, {
        userId: user.userId,
        role: user.role,
        tenantId: user.tenantId,
      });

      res.status(200).json({
        success: true,
        data: response,
        message: 'Users retrieved',
      });
    } catch (error: any) {
      logger.error('List users error', { error: error.message });
      throw error; // Let error middleware handle it
    }
  }

  /**
   * GET /api/v1/users/sellers
   * List sellers only
   */
  static async listSellers(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        status: req.query.status ? (req.query.status as UserStatus) : undefined,
        search: req.query.search as string | undefined,
      };

      const response = await UserService.listSellers(request, {
        userId: user.userId,
        role: user.role,
        tenantId: user.tenantId,
      });

      res.status(200).json({
        success: true,
        data: {
          sellers: response.users,
          pagination: response.pagination,
        },
        message: 'Sellers retrieved',
      });
    } catch (error: any) {
      logger.error('List sellers error', { error: error.message });
      throw error;
    }
  }

  /**
   * GET /api/v1/users/:id
   * Get user details
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = parseInt(idParam, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          code: 'INVALID_USER_ID',
        });
        return;
      }

      const response = await UserService.getUser(userId, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'User retrieved',
      });
    } catch (error: any) {
      logger.error('Get user error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/users
   * Create user/seller
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request: CreateUserRequest = req.body;

      const response = await UserService.createUser(request, user.userId);

      res.status(201).json({
        success: true,
        data: response,
        message: 'User created',
      });
    } catch (error: any) {
      logger.error('Create user error', { error: error.message });
      throw error;
    }
  }

  /**
   * PUT /api/v1/users/:id
   * Update user/seller
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = parseInt(idParam, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          code: 'INVALID_USER_ID',
        });
        return;
      }

      const request: UpdateUserRequest = req.body;
      const response = await UserService.updateUser(userId, request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'User updated',
      });
    } catch (error: any) {
      logger.error('Update user error', { error: error.message });
      throw error;
    }
  }

  /**
   * DELETE /api/v1/users/:id
   * Deactivate user (soft delete)
   */
  static async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = parseInt(idParam, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          code: 'INVALID_USER_ID',
        });
        return;
      }

      const response = await UserService.deactivateUser(userId, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'User deactivated',
      });
    } catch (error: any) {
      logger.error('Deactivate user error', { error: error.message });
      throw error;
    }
  }


  /**
   * PUT /api/v1/users/:id/pin
   * Set user PIN
  */
  static async setUserPIN(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = parseInt(idParam, 10);
      const { pin } = req.body;

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          code: 'INVALID_USER_ID',
        });
        return;
      }

      await UserService.setUserPIN(userId, pin, user.userId);

      res.status(200).json({
        success: true,
        data: {
          user_id: userId,
          pin_configured: true,
          updated_at: new Date(),
        },
        message: 'PIN configured successfully',
      });
    } catch (error: any) {
      logger.error('Set user PIN error', { error: error.message });
      throw error;
    }
  }

}