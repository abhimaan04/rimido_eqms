import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, checkPermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { createElectronicSignature } from '../utils/electronicSignature';

const router = express.Router();

// Get all documents
router.get(
  '/',
  authenticate,
  checkPermission('documents', 'read'),
  async (req, res, next) => {
    try {
      const { status, category_id, search } = req.query;
      let query = `
        SELECT d.*, dc.name as category_name,
               u1.first_name || ' ' || u1.last_name as created_by_name,
               u2.first_name || ' ' || u2.last_name as approved_by_name
        FROM documents d
        LEFT JOIN document_categories dc ON d.category_id = dc.id
        LEFT JOIN users u1 ON d.created_by = u1.id
        LEFT JOIN users u2 ON d.approved_by = u2.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND d.status = $${paramCount++}`;
        params.push(status);
      }

      if (category_id) {
        query += ` AND d.category_id = $${paramCount++}`;
        params.push(category_id);
      }

      if (search) {
        query += ` AND (d.title ILIKE $${paramCount} OR d.document_number ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY d.created_at DESC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get document by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('documents', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT d.*, dc.name as category_name,
                u1.first_name || ' ' || u1.last_name as created_by_name,
                u2.first_name || ' ' || u2.last_name as approved_by_name
         FROM documents d
         LEFT JOIN document_categories dc ON d.category_id = dc.id
         LEFT JOIN users u1 ON d.created_by = u1.id
         LEFT JOIN users u2 ON d.approved_by = u2.id
         WHERE d.id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Document not found', 404);
      }

      // Get approvals
      const approvalsResult = await pool.query(
        `SELECT da.*, u.first_name || ' ' || u.last_name as approver_name
         FROM document_approvals da
         JOIN users u ON da.approver_id = u.id
         WHERE da.document_id = $1
         ORDER BY da.approval_order`,
        [req.params.id]
      );

      // Get revisions
      const revisionsResult = await pool.query(
        `SELECT dr.*, u.first_name || ' ' || u.last_name as created_by_name
         FROM document_revisions dr
         JOIN users u ON dr.created_by = u.id
         WHERE dr.document_id = $1
         ORDER BY dr.revision_number DESC`,
        [req.params.id]
      );

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          approvals: approvalsResult.rows,
          revisions: revisionsResult.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create document
router.post(
  '/',
  authenticate,
  checkPermission('documents', 'create'),
  [
    body('title').trim().notEmpty(),
    body('document_number').trim().notEmpty(),
    body('document_type').notEmpty(),
    body('version').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        document_number,
        title,
        category_id,
        document_type,
        version,
        description,
        effective_date,
        review_date,
        keywords,
      } = req.body;

      // Check if document number already exists
      const existingDoc = await pool.query(
        'SELECT id FROM documents WHERE document_number = $1',
        [document_number]
      );

      if (existingDoc.rows.length > 0) {
        throw new AppError('Document number already exists', 400);
      }

      const result = await pool.query(
        `INSERT INTO documents 
         (document_number, title, category_id, document_type, version, description, 
          effective_date, review_date, keywords, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10)
         RETURNING *`,
        [
          document_number,
          title,
          category_id || null,
          document_type,
          version,
          description || null,
          effective_date || null,
          review_date || null,
          keywords || null,
          req.user!.id,
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update document
router.put(
  '/:id',
  authenticate,
  checkPermission('documents', 'update'),
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        file_path,
        file_hash,
        file_size,
        mime_type,
        effective_date,
        review_date,
        keywords,
      } = req.body;

      const result = await pool.query(
        `UPDATE documents 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             file_path = COALESCE($3, file_path),
             file_hash = COALESCE($4, file_hash),
             file_size = COALESCE($5, file_size),
             mime_type = COALESCE($6, mime_type),
             effective_date = COALESCE($7, effective_date),
             review_date = COALESCE($8, review_date),
             keywords = COALESCE($9, keywords),
             updated_by = $10
         WHERE id = $11 AND status != 'approved'
         RETURNING *`,
        [
          title,
          description,
          file_path,
          file_hash,
          file_size,
          mime_type,
          effective_date,
          review_date,
          keywords,
          req.user!.id,
          req.params.id,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError('Document not found or cannot be modified', 404);
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Submit for approval
router.post(
  '/:id/submit',
  authenticate,
  checkPermission('documents', 'update'),
  [body('approver_ids').isArray().notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { approver_ids } = req.body;

      // Update document status
      await pool.query(
        `UPDATE documents SET status = 'under_review' WHERE id = $1`,
        [req.params.id]
      );

      // Create approval records
      for (let i = 0; i < approver_ids.length; i++) {
        await pool.query(
          `INSERT INTO document_approvals (document_id, approver_id, approval_order, status)
           VALUES ($1, $2, $3, 'pending')
           ON CONFLICT (document_id, approver_id, approval_order) DO NOTHING`,
          [req.params.id, approver_ids[i], i + 1]
        );
      }

      res.json({
        success: true,
        message: 'Document submitted for approval',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Approve document
router.post(
  '/:id/approve',
  authenticate,
  checkPermission('documents', 'approve'),
  [body('comments').optional()],
  async (req, res, next) => {
    try {
      const { comments } = req.body;
      const documentId = req.params.id;

      // Check if user is an approver
      const approvalCheck = await pool.query(
        `SELECT id FROM document_approvals 
         WHERE document_id = $1 AND approver_id = $2 AND status = 'pending'`,
        [documentId, req.user!.id]
      );

      if (approvalCheck.rows.length === 0) {
        throw new AppError('You are not authorized to approve this document', 403);
      }

      // Create electronic signature
      const signatureId = await createElectronicSignature({
        userId: req.user!.id,
        documentType: 'document',
        documentId: documentId,
        action: 'approve',
        signatureType: 'approval',
        reason: comments,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Update approval
      await pool.query(
        `UPDATE document_approvals 
         SET status = 'approved', comments = $1, approved_at = NOW(), signature_id = $2
         WHERE document_id = $3 AND approver_id = $4`,
        [comments || null, signatureId, documentId, req.user!.id]
      );

      // Check if all approvals are complete
      const pendingApprovals = await pool.query(
        `SELECT COUNT(*) as count FROM document_approvals 
         WHERE document_id = $1 AND status = 'pending'`,
        [documentId]
      );

      if (parseInt(pendingApprovals.rows[0].count) === 0) {
        // All approvals complete - approve document
        await pool.query(
          `UPDATE documents 
           SET status = 'approved', approved_by = $1, approved_at = NOW()
           WHERE id = $2`,
          [req.user!.id, documentId]
        );
      }

      res.json({
        success: true,
        message: 'Document approved',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Obsolete document
router.post(
  '/:id/obsolete',
  authenticate,
  checkPermission('documents', 'update'),
  async (req, res, next) => {
    try {
      const { superseded_by } = req.body;
      const documentId = req.params.id;

      // Update document status to obsolete
      const result = await pool.query(
        `UPDATE documents 
         SET status = 'obsolete', 
             superseded_by = $1,
             updated_by = $2,
             updated_at = NOW()
         WHERE id = $3 AND status = 'approved'
         RETURNING *`,
        [superseded_by || null, req.user!.id, documentId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Document not found or cannot be obsoleted (must be approved)', 404);
      }

      res.json({
        success: true,
        message: 'Document obsoleted successfully',
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get document categories
router.get(
  '/categories/list',
  authenticate,
  checkPermission('documents', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        'SELECT * FROM document_categories ORDER BY name'
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
