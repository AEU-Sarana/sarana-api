import { Request, Response } from 'express';
import { ShiftService } from '@src/domains/Shift/services/shift.service';
import { ShiftReconciliationService } from '@src/domains/Shift/services/shift-reconciliation.service';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';
import { ValidationException } from '@src/shared/exceptions';

export class ShiftController {
  static async startShift(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const response = await ShiftService.startShift(req.body, user.userId, user.role);
      res.status(200).json({ success: true, data: response, message: 'Shift started' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Start shift error', { error: message });
      throw error;
    }
  }

  static async closeShift(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const shiftId = parseInt(idParam, 10);
      if (isNaN(shiftId)) {
        throw new ValidationException('Invalid shift ID');
      }
      const response = await ShiftService.closeShift(shiftId, req.body, user.userId, user.role);
      res.status(200).json({ success: true, data: response, message: 'Shift closed' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Close shift error', { error: message });
      throw error;
    }
  }

  static async listShifts(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const sellerId = req.query.seller_id ? parseInt(req.query.seller_id as string, 10) : undefined;
      
      if (isNaN(page) || page < 1) {
        throw new ValidationException('Invalid page number');
      }
      if (isNaN(limit) || limit < 1) {
        throw new ValidationException('Invalid limit');
      }
      if (sellerId !== undefined && isNaN(sellerId)) {
        throw new ValidationException('Invalid seller ID');
      }
      
      const request = {
        page,
        limit,
        seller_id: sellerId,
        status: req.query.status as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
      };
      const response = await ShiftService.listShifts(request, user.userId, user.role);
      res.status(200).json({ success: true, data: response, message: 'Shifts retrieved' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('List shifts error', { error: message });
      throw error;
    }
  }

  static async getShift(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const shiftId = parseInt(idParam, 10);
      if (isNaN(shiftId)) {
        throw new ValidationException('Invalid shift ID');
      }
      const response = await ShiftService.getShift(shiftId, user.userId, user.role);
      res.status(200).json({ success: true, data: response, message: 'Shift retrieved' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get shift error', { error: message });
      throw error;
    }
  }

  static async getReconciliation(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const shiftId = parseInt(idParam, 10);
      if (isNaN(shiftId)) {
        throw new ValidationException('Invalid shift ID');
      }
      const response = await ShiftReconciliationService.getReconciliation(shiftId, user.userId);
      res.status(200).json({ success: true, data: response, message: 'Reconciliation retrieved' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get reconciliation error', { error: message });
      throw error;
    }
  }
}