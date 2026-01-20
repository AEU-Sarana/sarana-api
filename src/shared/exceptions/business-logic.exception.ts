export class BusinessLogicException extends Error {
    public readonly code: string;
    public readonly statusCode: number;
  
    constructor(message: string, code: string = 'BUSINESS_LOGIC_ERROR', statusCode: number = 422) {
      super(message);
      this.name = 'BusinessLogicException';
      this.code = code;
      this.statusCode = statusCode;
      Error.captureStackTrace(this, this.constructor);
    }
  }