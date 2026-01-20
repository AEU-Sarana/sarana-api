import { Request, Response, NextFunction } from 'express';
import { logger } from '@src/shared/utils/logger';
import { 
  ValidationException, 
  BusinessLogicException, 
  DomainException 
} from '@src/shared/exceptions';

export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors?: any[];
  stack?: string;
}

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
  });

  // Handle known exceptions
  if (err instanceof ValidationException) {
    const validationErr = err as ValidationException;
    res.status(400).json({
      success: false,
      message: validationErr.message,
      code: 'VALIDATION_ERROR',
      errors: validationErr.errors,
    });
    return;
  }

  if (err instanceof BusinessLogicException) {
    res.status(422).json({
      success: false,
      message: err.message,
      code: 'BUSINESS_LOGIC_ERROR',
    });
    return;
  }

  if (err instanceof DomainException) {
    res.status(400).json({
      success: false,
      message: err.message,
      code: 'DOMAIN_ERROR',
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      success: false,
      message: 'Database operation failed',
      code: 'DATABASE_ERROR',
    });
    return;
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    message: isDevelopment ? err.message : 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    ...(isDevelopment && { stack: err.stack }),
  });
}