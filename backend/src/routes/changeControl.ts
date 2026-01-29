import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, checkPermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { createElectronicSignature } from '../utils/electronicSignature';

const router = express.Router();

// Get all change controls
router.get(
  '/',
  authenticate,
  checkPermission('change_control', 'read'),
  async (req, res, next) => {
    try {
      const { status, change_type, priority } = req.query;
      let query = `
        SELECT cc.*, 
               u1.first_name || ' ' || u1.last_name as created_by_name,
               u2.first_name || ' ' || u2.last_name as owner_name
        FROM change_control cc
        LEFT JOIN users u1 ON cc.created_by = u1.id
        LEFT JOIN users u2 ON cc.owner_id = u2.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND cc.status = $${paramCount++}`;
        params.push(status);
      }
      if (change_type) {
        query += ` AND cc.change_type = $${paramCount++}`;
        params.push(change_type);
      }
      if (priority) {
        query += ` AND cc.priority = $${paramCount++}`;
        params.push(priority);
      }

      query += ` ORDER BY cc.created_at DESC`;

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

// Get change control by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('change_control', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT cc.*, 
                u1.first_name || ' ' || u1.last_name as created_by_name,
                u2.first_name || ' ' || u2.last_name as owner_name
         FROM change_control cc
         LEFT JOIN users u1 ON cc.created_by = u1.id
         LEFT JOIN users u2 ON cc.owner_id = u2.id
         WHERE cc.id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Change control not found', 404);
      }

      // Get change items
      const itemsResult = await pool.query(
        `SELECT * FROM change_control_items WHERE change_control_id = $1`,
        [req.params.id]
      );

      // Get approvals
      const approvalsResult = await pool.query(
        `SELECT cca.*, u.first_name || ' ' || u.last_name as approver_name
         FROM change_control_approvals cca
         JOIN users u ON cca.approver_id = u.id
         WHERE cca.change_control_id = $1
         ORDER BY cca.approval_order`,
        [req.params.id]
      );

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          items: itemsResult.rows,
          approvals: approvalsResult.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create change control
router.post(
  '/',
  authenticate,
  checkPermission('change_control', 'create'),
  [
    body('title').trim().notEmpty(),
    body('change_type').notEmpty(),
    body('priority').isIn(['low', 'medium', 'high', 'critical']),
    body('description').trim().notEmpty(),
    body('reason_for_change').trim().notEmpty(),
    body('proposed_change').trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        change_type,
        priority,
        description,
        reason_for_change,
        proposed_change,
        impact_analysis,
        owner_id,
        target_completion_date,
      } = req.body;

      // Generate change number
      const countResult = await pool.query('SELECT COUNT(*) as count FROM change_control');
      const count = parseInt(countResult.rows[0].count) + 1;
      const changeNumber = `ECO-${String(count).padStart(5, '0')}`;

      const result = await pool.query(
        `INSERT INTO change_control 
         (change_number, title, change_type, priority, description, reason_for_change,
          proposed_change, impact_analysis, owner_id, target_completion_date, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'initiated', $11)
         RETURNING *`,
        [
          changeNumber,
          title,
          change_type,
          priority,
          description,
          reason_for_change,
          proposed_change,
          impact_analysis || null,
          owner_id || null,
          target_completion_date || null,
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

// Submit for approval
router.post(
  '/:id/submit',
  authenticate,
  checkPermission('change_control', 'update'),
  [body('approver_ids').isArray().notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { approver_ids } = req.body;

      // Update status
      await pool.query(
        `UPDATE change_control SET status = 'review' WHERE id = $1`,
        [req.params.id]
      );

      // Create approval records
      for (let i = 0; i < approver_ids.length; i++) {
        await pool.query(
          `INSERT INTO change_control_approvals 
           (change_control_id, approver_id, approval_order, status)
           VALUES ($1, $2, $3, 'pending')
           ON CONFLICT (change_control_id, approver_id, approval_order) DO NOTHING`,
          [req.params.id, approver_ids[i], i + 1]
        );
      }

      res.json({
        success: true,
        message: 'Change control submitted for approval',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Approve change control
router.post(
  '/:id/approve',
  authenticate,
  checkPermission('change_control', 'approve'),
  [body('comments').optional()],
  async (req, res, next) => {
    try {
      const { comments } = req.body;
      const changeControlId = req.params.id;

      // Check if user is an approver
      const approvalCheck = await pool.query(
        `SELECT id FROM change_control_approvals 
         WHERE change_control_id = $1 AND approver_id = $2 AND status = 'pending'`,
        [changeControlId, req.user!.id]
      );

      if (approvalCheck.rows.length === 0) {
        throw new AppError('You are not authorized to approve this change', 403);
      }

      // Create electronic signature
      const signatureId = await createElectronicSignature({
        userId: req.user!.id,
        documentType: 'change_control',
        documentId: changeControlId,
        action: 'approve',
        signatureType: 'approval',
        reason: comments,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Update approval
      await pool.query(
        `UPDATE change_control_approvals 
         SET status = 'approved', comments = $1, approved_at = NOW(), signature_id = $2
         WHERE change_control_id = $3 AND approver_id = $4`,
        [comments || null, signatureId, changeControlId, req.user!.id]
      );

      // Check if all approvals are complete
      const pendingApprovals = await pool.query(
        `SELECT COUNT(*) as count FROM change_control_approvals 
         WHERE change_control_id = $1 AND status = 'pending'`,
        [changeControlId]
      );

      if (parseInt(pendingApprovals.rows[0].count) === 0) {
        // All approvals complete
        await pool.query(
          `UPDATE change_control 
           SET status = 'approval', change_board_approver_id = $1
           WHERE id = $2`,
          [req.user!.id, changeControlId]
        );
      }

      res.json({
        success: true,
        message: 'Change control approved',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
