import { Request } from 'express';
import { UserPayload } from '@src/shared/middleware/auth.middleware';

/**
 * Extended Express Request with user
 */
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  apiVersion?: string;
}

/**
 * Query parameters for list endpoints
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Filter parameters
 */
export interface FilterParams {
  status?: string;
  role?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}