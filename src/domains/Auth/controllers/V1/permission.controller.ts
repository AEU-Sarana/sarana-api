import { Request, Response } from 'express';
import { PermissionService } from '../../services/V1/permission.service';
import { SYSTEM_FEATURES } from '@src/shared/constants/permissions';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

const permissionService = new PermissionService();

export class PermissionController {
  /**
   * GET /api/v1/permissions/features
   * List all master system features
   */
  static async getSystemFeatures(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: SYSTEM_FEATURES,
      message: 'Master system features retrieved',
    });
  }

  /**
   * GET /api/v1/users/:id/permissions
   * Get permissions assigned to a target user
   */
  static async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const targetUserId = parseInt(idParam, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID',
        });
        return;
      }

      const permissions = await permissionService.getUserPermissions(targetUserId, 'CASHIER');

      res.status(200).json({
        success: true,
        data: {
          user_id: targetUserId,
          permissions,
        },
        message: 'User permissions retrieved',
      });
    } catch (error: any) {
      logger.error('Get user permissions error', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch user permissions',
      });
    }
  }

  /**
   * PUT /api/v1/users/:id/permissions
   * Update feature permissions for a target user (Admin only)
   */
  static async updateUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const targetUserId = parseInt(idParam, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID',
        });
        return;
      }

      const adminUser = req.user as UserPayload;
      if (adminUser?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Only admins can manage cashier permissions',
        });
        return;
      }

      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          message: 'Permissions must be an array of feature items or strings',
        });
        return;
      }

      const updated = await permissionService.updateUserPermissions(
        targetUserId,
        permissions,
        adminUser.userId
      );

      res.status(200).json({
        success: true,
        data: {
          user_id: targetUserId,
          permissions: updated,
        },
        message: 'User permissions updated successfully',
      });
    } catch (error: any) {
      logger.error('Update user permissions error', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update user permissions',
      });
    }
  }
}
