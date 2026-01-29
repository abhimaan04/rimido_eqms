import { Request, Response, NextFunction } from 'express';
import { pool } from '../database/connection';
import crypto from 'crypto';

interface AuditRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  auditData?: {
    resourceType?: string;
    resourceId?: string;
    action?: string;
  };
}

export const auditLogger = async (
  req: AuditRequest,
  res: Response,
  next: NextFunction
) => {
  // Skip audit logging for health checks and static assets
  if (
    req.path === '/health' ||
    req.path.startsWith('/static') ||
    req.path.startsWith('/_next')
  ) {
    return next();
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture response
  res.json = function (body: any) {
    // Log audit trail after response is sent
    setImmediate(() => {
      logAuditTrail(req, res, body);
    });
    return originalJson(body);
  };

  next();
};

async function logAuditTrail(
  req: AuditRequest,
  res: Response,
  body: any
): Promise<void> {
  try {
    // Only log if audit is enabled
    if (process.env.AUDIT_ENABLED !== 'true') {
      return;
    }

    const userId = req.user?.id || null;
    const action = req.auditData?.action || getActionFromMethod(req.method);
    const resourceType = req.auditData?.resourceType || extractResourceType(req.path);
    const resourceId = req.auditData?.resourceId || extractResourceId(req.path, body);

    // Get previous hash for chaining
    const previousHashResult = await pool.query(
      `SELECT hash FROM audit_trail ORDER BY timestamp DESC LIMIT 1`
    );
    const previousHash = previousHashResult.rows[0]?.hash || null;

    // Create hash for this entry
    const hashInput = `${userId}-${action}-${resourceType}-${resourceId}-${Date.now()}-${previousHash}`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // Prepare values
    const newValues: any = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    };

    if (body && typeof body === 'object') {
      // Include relevant response data (sanitize sensitive info)
      newValues.response = sanitizeAuditData(body);
    }

    // Insert audit trail entry
    await pool.query(
      `INSERT INTO audit_trail 
       (user_id, action, resource_type, resource_id, new_values, ip_address, user_agent, hash, previous_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(newValues),
        req.ip || req.socket.remoteAddress,
        req.get('user-agent'),
        hash,
        previousHash,
      ]
    );
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Failed to log audit trail:', error);
  }
}

function getActionFromMethod(method: string): string {
  const methodMap: Record<string, string> = {
    GET: 'view',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  return methodMap[method] || method.toLowerCase();
}

function extractResourceType(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length > 1 && parts[0] === 'api') {
    return parts[1] || 'unknown';
  }
  return 'unknown';
}

function extractResourceId(path: string, body: any): string | null {
  // Try to extract ID from URL
  const parts = path.split('/').filter(Boolean);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  for (const part of parts) {
    if (uuidRegex.test(part)) {
      return part;
    }
  }

  // Try to extract from response body
  if (body && typeof body === 'object') {
    if (body.id) return body.id;
    if (body.data?.id) return body.data.id;
  }

  return null;
}

function sanitizeAuditData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
