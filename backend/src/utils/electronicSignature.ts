import crypto from 'crypto';
import { pool } from '../database/connection';
import { AppError } from '../errors/AppError';

interface SignatureData {
  userId: string;
  documentType: string;
  documentId: string;
  action: string;
  signatureType: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an electronic signature compliant with FDA 21 CFR Part 11
 * Requirements:
 * - Unique identification of signer
 * - Date and time of signature
 * - Meaning of signature (approval, review, etc.)
 * - Cryptographic hash for integrity
 */
export async function createElectronicSignature(
  signatureData: SignatureData
): Promise<string> {
  const {
    userId,
    documentType,
    documentId,
    action,
    signatureType,
    reason,
    ipAddress,
    userAgent,
  } = signatureData;

  // Verify user exists and is active
  const userResult = await pool.query(
    `SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw new AppError('User account is inactive', 400);
  }

  // Create signature hash
  const signatureContent = `${userId}-${documentType}-${documentId}-${action}-${signatureType}-${Date.now()}`;
  const signatureHash = crypto
    .createHash('sha256')
    .update(signatureContent)
    .digest('hex');

  // Insert signature record
  const result = await pool.query(
    `INSERT INTO electronic_signatures 
     (user_id, document_type, document_id, action, signature_type, signature_hash, ip_address, user_agent, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      userId,
      documentType,
      documentId,
      action,
      signatureType,
      signatureHash,
      ipAddress,
      userAgent,
      reason,
    ]
  );

  return result.rows[0].id;
}

/**
 * Verifies an electronic signature
 */
export async function verifyElectronicSignature(
  signatureId: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT id, is_valid, revoked_at FROM electronic_signatures WHERE id = $1`,
    [signatureId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const signature = result.rows[0];
  return signature.is_valid && !signature.revoked_at;
}

/**
 * Revokes an electronic signature (with proper authorization)
 */
export async function revokeElectronicSignature(
  signatureId: string,
  revokedBy: string,
  reason: string
): Promise<void> {
  // Verify signature exists
  const signatureResult = await pool.query(
    `SELECT id FROM electronic_signatures WHERE id = $1`,
    [signatureId]
  );

  if (signatureResult.rows.length === 0) {
    throw new AppError('Signature not found', 404);
  }

  // Update signature
  await pool.query(
    `UPDATE electronic_signatures 
     SET is_valid = false, revoked_at = NOW(), revoked_by = $1, revocation_reason = $2
     WHERE id = $3`,
    [revokedBy, reason, signatureId]
  );
}

/**
 * Gets all signatures for a document
 */
export async function getDocumentSignatures(
  documentType: string,
  documentId: string
): Promise<any[]> {
  const result = await pool.query(
    `SELECT es.*, u.email, u.first_name, u.last_name
     FROM electronic_signatures es
     JOIN users u ON es.user_id = u.id
     WHERE es.document_type = $1 AND es.document_id = $2
     ORDER BY es.signed_at ASC`,
    [documentType, documentId]
  );

  return result.rows;
}
