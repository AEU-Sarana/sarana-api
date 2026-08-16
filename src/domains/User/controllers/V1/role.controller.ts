import { Request, Response, NextFunction } from 'express';
import { RoleService } from '../../services/role.service';

function parseIdParam(param: string | string[]): number {
  const str = Array.isArray(param) ? param[0] : param;
  return parseInt(str, 10);
}

export class RoleController {
  /**
   * List all roles
   */
  static async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await RoleService.listRoles();
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role details
   */
  static async getRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = parseIdParam(req.params.id);
      const role = await RoleService.getRole(roleId);
      res.status(200).json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create custom role
   */
  static async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user!.userId;
      const role = await RoleService.createRole(req.body, currentUserId);
      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update custom role
   */
  static async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = parseIdParam(req.params.id);
      const currentUserId = req.user!.userId;
      const role = await RoleService.updateRole(roleId, req.body, currentUserId);
      res.status(200).json({
        success: true,
        message: 'Role updated successfully',
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete custom role
   */
  static async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = parseIdParam(req.params.id);
      const currentUserId = req.user!.userId;
      await RoleService.deleteRole(roleId, currentUserId);
      res.status(200).json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
