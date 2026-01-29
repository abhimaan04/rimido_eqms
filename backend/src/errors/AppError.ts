/**
 * Application error class — use for operational errors with HTTP status.
 * Import from here so TypeScript treats it as a value (class), not only a type.
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
