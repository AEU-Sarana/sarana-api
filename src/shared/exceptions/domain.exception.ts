export class DomainException extends Error {
    public readonly code: string;
    public readonly statusCode: number;
  
    constructor(message: string, code: string = 'DOMAIN_ERROR', statusCode: number = 400) {
      super(message);
      this.name = 'DomainException';
      this.code = code;
      this.statusCode = statusCode;
      Error.captureStackTrace(this, this.constructor);
    }
  }