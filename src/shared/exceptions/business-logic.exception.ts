export class BusinessLogicException extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details?: Record<string, unknown>;
  
    constructor(
      message: string,
      code: string = 'BUSINESS_LOGIC_ERROR',
      statusCode: number = 422,
      details?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'BusinessLogicException';
      this.code = code;
      this.statusCode = statusCode;
      this.details = details;
      Error.captureStackTrace(this, this.constructor);
    }
  }
