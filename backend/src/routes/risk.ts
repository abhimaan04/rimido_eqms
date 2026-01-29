import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, checkPermission } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createElectronicSignature } from '../utils/electronicSignature';

const router = express.Router();

// Get all risk assessments
router.get(
  '/',
  authenticate,
  checkPermission('risk', 'read'),
  async (req, res, next) => {
    try {
      const { status, risk_level } = req.query;
      let query = `
        SELECT ra.*, 
               u.first_name || ' ' || u.last_name as created_by_name,
               reviewer.first_name || ' ' || reviewer.last_name as reviewer_name
        FROM risk_assessments ra
        LEFT JOIN users u ON ra.created_by = u.id
        LEFT JOIN users reviewer ON ra.reviewer_id = reviewer.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND ra.status = $${paramCount++}`;
        params.push(status);
      }
      if (risk_level) {
        query += ` AND ra.risk_level = $${paramCount++}`;
        params.push(risk_level);
      }

      query += ` ORDER BY ra.risk_score DESC, ra.created_at DESC`;

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

// Get risk assessment by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('risk', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT ra.*, 
                u.first_name || ' ' || u.last_name as created_by_name,
                reviewer.first_name || ' ' || reviewer.last_name as reviewer_name
         FROM risk_assessments ra
         LEFT JOIN users u ON ra.created_by = u.id
         LEFT JOIN users reviewer ON ra.reviewer_id = reviewer.id
         WHERE ra.id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Risk assessment not found', 404);
      }

      // Get mitigations
      const mitigationsResult = await pool.query(
        `SELECT rm.*, u.first_name || ' ' || u.last_name as responsible_name
         FROM risk_mitigations rm
         LEFT JOIN users u ON rm.responsible_person_id = u.id
         WHERE rm.risk_assessment_id = $1
         ORDER BY rm.created_at`,
        [req.params.id]
      );

      // Get reviews
      const reviewsResult = await pool.query(
        `SELECT rr.*, u.first_name || ' ' || u.last_name as reviewed_by_name
         FROM risk_reviews rr
         JOIN users u ON rr.reviewed_by = u.id
         WHERE rr.risk_assessment_id = $1
         ORDER BY rr.review_date DESC`,
        [req.params.id]
      );

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          mitigations: mitigationsResult.rows,
          reviews: reviewsResult.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create risk assessment
router.post(
  '/',
  authenticate,
  checkPermission('risk', 'create'),
  [
    body('title').trim().notEmpty(),
    body('hazard').trim().notEmpty(),
    body('hazard_situation').trim().notEmpty(),
    body('harm').trim().notEmpty(),
    body('severity').isInt({ min: 1, max: 5 }),
    body('probability').isInt({ min: 1, max: 5 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        product_component,
        hazard,
        hazard_situation,
        harm,
        severity,
        probability,
        current_controls,
        mitigation_measures,
        reviewer_id,
        review_date,
      } = req.body;

      // Generate assessment number
      const countResult = await pool.query('SELECT COUNT(*) as count FROM risk_assessments');
      const count = parseInt(countResult.rows[0].count) + 1;
      const assessmentNumber = `RISK-${String(count).padStart(5, '0')}`;

      const result = await pool.query(
        `INSERT INTO risk_assessments 
         (assessment_number, title, product_component, hazard, hazard_situation, harm,
          severity, probability, current_controls, mitigation_measures, reviewer_id,
          review_date, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'new', $13)
         RETURNING *`,
        [
          assessmentNumber,
          title,
          product_component || null,
          hazard,
          hazard_situation,
          harm,
          severity,
          probability,
          current_controls || null,
          mitigation_measures || null,
          reviewer_id || null,
          review_date || null,
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

// Add mitigation
router.post(
  '/:id/mitigations',
  authenticate,
  checkPermission('risk', 'update'),
  [
    body('mitigation_type').isIn(['elimination', 'reduction', 'protection', 'warning']),
    body('description').trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        mitigation_type,
        description,
        responsible_person_id,
        target_completion_date,
      } = req.body;

      const result = await pool.query(
        `INSERT INTO risk_mitigations 
         (risk_assessment_id, mitigation_type, description, responsible_person_id,
          target_completion_date, status)
         VALUES ($1, $2, $3, $4, $5, 'planned')
         RETURNING *`,
        [
          req.params.id,
          mitigation_type,
          description,
          responsible_person_id || null,
          target_completion_date || null,
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
