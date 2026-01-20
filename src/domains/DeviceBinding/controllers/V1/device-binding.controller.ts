import { Request, Response } from 'express';
import { DeviceBindingService } from '@src/domains/DeviceBinding/services/device-binding.service';
import {
  ListDeviceBindingsRequest,
  RegisterDeviceRequest,
} from '@src/domains/DeviceBinding/types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

export class DeviceBindingController {
  /**
   * GET /api/v1/device-bindings
   * List device bindings with filters
   */
  static async listDeviceBindings(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request: ListDeviceBindingsRequest = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        user_id: req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined,
        status: req.query.status as string,
      };

      const response = await DeviceBindingService.listDeviceBindings(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Device bindings retrieved successfully',
      });
    } catch (error: any) {
      logger.error('List device bindings error', { error: error.message });
      throw error; // Let error middleware handle it
    }
  }

  /**
   * GET /api/v1/device-bindings/:id
   * Get device binding details
   */
  static async getDeviceBinding(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const bindingId = parseInt(idParam, 10);

      if (isNaN(bindingId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid device binding ID',
          code: 'INVALID_BINDING_ID',
        });
        return;
      }

      const response = await DeviceBindingService.getDeviceBinding(bindingId, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Device binding retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get device binding error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/device-bindings
   * Register device binding
   */
  static async registerDevice(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request: RegisterDeviceRequest = req.body;

      const response = await DeviceBindingService.registerDevice(request, user.userId);

      res.status(201).json({
        success: true,
        data: response,
        message: 'Device binding registered successfully',
      });
    } catch (error: any) {
      logger.error('Register device error', { error: error.message });
      throw error;
    }
  }

  /**
   * PUT /api/v1/device-bindings/:id/approve
   * Approve device binding
   */
  static async approveDevice(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const bindingId = parseInt(idParam, 10);

      if (isNaN(bindingId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid device binding ID',
          code: 'INVALID_BINDING_ID',
        });
        return;
      }

      const response = await DeviceBindingService.approveDevice(bindingId, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Device approved successfully',
      });
    } catch (error: any) {
      logger.error('Approve device error', { error: error.message });
      throw error;
    }
  }

  /**
   * PUT /api/v1/device-bindings/:id/revoke
   * Revoke device binding
   */
  static async revokeDevice(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const bindingId = parseInt(idParam, 10);

      if (isNaN(bindingId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid device binding ID',
          code: 'INVALID_BINDING_ID',
        });
        return;
      }

      const response = await DeviceBindingService.revokeDevice(bindingId, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Device revoked successfully',
      });
    } catch (error: any) {
      logger.error('Revoke device error', { error: error.message });
      throw error;
    }
  }

  /**
   * DELETE /api/v1/device-bindings/:id
   * Remove device binding
   */
  static async removeDevice(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const bindingId = parseInt(idParam, 10);

      if (isNaN(bindingId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid device binding ID',
          code: 'INVALID_BINDING_ID',
        });
        return;
      }

      await DeviceBindingService.removeDevice(bindingId, user.userId);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Device binding removed successfully',
      });
    } catch (error: any) {
      logger.error('Remove device error', { error: error.message });
      throw error;
    }
  }
}