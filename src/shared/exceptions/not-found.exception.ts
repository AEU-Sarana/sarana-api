export class NotFoundException extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string = 'Not found',
    code: string = 'NOT_FOUND',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NotFoundException';
    this.code = code;
    this.statusCode = 404;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
