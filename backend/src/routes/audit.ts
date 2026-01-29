import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, checkPermission } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

// Get all audits
router.get(
  '/',
  authenticate,
  checkPermission('audit', 'read'),
  async (req, res, next) => {
    try {
      const { status, audit_type } = req.query;
      let query = `
        SELECT a.*, 
               u.first_name || ' ' || u.last_name as lead_auditor_name
        FROM audits a
        LEFT JOIN users u ON a.lead_auditor_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND a.status = $${paramCount++}`;
        params.push(status);
      }
      if (audit_type) {
        query += ` AND a.audit_type = $${paramCount++}`;
        params.push(audit_type);
      }

      query += ` ORDER BY a.scheduled_start_date DESC`;

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

// Get audit by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('audit', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT a.*, 
                u.first_name || ' ' || u.last_name as lead_auditor_name
         FROM audits a
         LEFT JOIN users u ON a.lead_auditor_id = u.id
         WHERE a.id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Audit not found', 404);
      }

      // Get audit team
      const teamResult = await pool.query(
        `SELECT at.*, u.first_name || ' ' || u.last_name as auditor_name
         FROM audit_team at
         JOIN users u ON at.auditor_id = u.id
         WHERE at.audit_id = $1`,
        [req.params.id]
      );

      // Get findings
      const findingsResult = await pool.query(
        `SELECT af.*, u.first_name || ' ' || u.last_name as created_by_name
         FROM audit_findings af
         LEFT JOIN users u ON af.created_by = u.id
         WHERE af.audit_id = $1
         ORDER BY af.finding_number`,
        [req.params.id]
      );

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          team: teamResult.rows,
          findings: findingsResult.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create audit
router.post(
  '/',
  authenticate,
  checkPermission('audit', 'create'),
  [
    body('audit_type').isIn(['internal', 'external', 'supplier', 'regulatory']),
    body('scope').trim().notEmpty(),
    body('scheduled_start_date').isISO8601(),
    body('scheduled_end_date').isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        audit_type,
        scope,
        standard,
        scheduled_start_date,
        scheduled_end_date,
        lead_auditor_id,
        auditee,
        location,
        objectives,
      } = req.body;

      // Generate audit number
      const countResult = await pool.query('SELECT COUNT(*) as count FROM audits');
      const count = parseInt(countResult.rows[0].count) + 1;
      const auditNumber = `AUD-${String(count).padStart(5, '0')}`;

      const result = await pool.query(
        `INSERT INTO audits 
         (audit_number, audit_type, scope, standard, scheduled_start_date, scheduled_end_date,
          lead_auditor_id, auditee, location, objectives, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'planned', $11)
         RETURNING *`,
        [
          auditNumber,
          audit_type,
          scope,
          standard || null,
          scheduled_start_date,
          scheduled_end_date,
          lead_auditor_id || null,
          auditee || null,
          location || null,
          objectives || null,
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

// Add finding to audit
router.post(
  '/:id/findings',
  authenticate,
  checkPermission('audit', 'update'),
  [
    body('type').isIn(['non_conformity', 'observation', 'opportunity']),
    body('description').trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        finding_number,
        type,
        severity,
        clause_reference,
        description,
        evidence,
        target_completion_date,
      } = req.body;

      // Generate finding number if not provided
      let finalFindingNumber = finding_number;
      if (!finalFindingNumber) {
        const countResult = await pool.query(
          'SELECT COUNT(*) as count FROM audit_findings WHERE audit_id = $1',
          [req.params.id]
        );
        const count = parseInt(countResult.rows[0].count) + 1;
        finalFindingNumber = `F${String(count).padStart(3, '0')}`;
      }

      const result = await pool.query(
        `INSERT INTO audit_findings 
         (audit_id, finding_number, type, severity, clause_reference, description,
          evidence, target_completion_date, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9)
         RETURNING *`,
        [
          req.params.id,
          finalFindingNumber,
          type,
          severity || null,
          clause_reference || null,
          description,
          evidence || null,
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

export default router;
