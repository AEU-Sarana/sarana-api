export class ForbiddenException extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string = 'Forbidden',
    code: string = 'FORBIDDEN',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ForbiddenException';
    this.code = code;
    this.statusCode = 403;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
