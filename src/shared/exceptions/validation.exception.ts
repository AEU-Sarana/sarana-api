export class ValidationException extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly errors: any[];
  
    constructor(
      message: string,
      errors: any[] = [],
      code: string = 'VALIDATION_ERROR',
      statusCode: number = 400
    ) {
      super(message);
      this.name = 'ValidationException';
      this.code = code;
      this.statusCode = statusCode;
      this.errors = errors;
      Error.captureStackTrace(this, this.constructor);
    }
  }