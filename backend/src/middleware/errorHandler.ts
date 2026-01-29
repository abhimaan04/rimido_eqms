import { Request, Response, NextFunction } from 'express';
import { pool } from '../database/connection';
import crypto from 'crypto';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error to audit trail
  if (req.user) {
    logErrorToAudit(req.user.id, err, req);
  }

  console.error('Error:', {
    message,
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

async function logErrorToAudit(userId: string, error: AppError, req: Request) {
  try {
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}-${Date.now()}-${error.message}`)
      .digest('hex');

    await pool.query(
      `INSERT INTO audit_trail (user_id, action, resource_type, resource_id, new_values, ip_address, user_agent, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        'error',
        'system',
        null,
        JSON.stringify({ error: error.message, statusCode: error.statusCode }),
        req.ip,
        req.get('user-agent'),
        hash,
      ]
    );
  } catch (auditError) {
    console.error('Failed to log error to audit trail:', auditError);
  }
}

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
