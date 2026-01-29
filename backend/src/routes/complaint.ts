import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, checkPermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';

const router = express.Router();

// Get all complaints
router.get(
  '/',
  authenticate,
  checkPermission('complaint', 'read'),
  async (req, res, next) => {
    try {
      const { status, severity } = req.query;
      let query = `
        SELECT c.*, 
               u.first_name || ' ' || u.last_name as created_by_name,
               owner.first_name || ' ' || owner.last_name as owner_name
        FROM complaints c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN users owner ON c.owner_id = owner.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND c.status = $${paramCount++}`;
        params.push(status);
      }
      if (severity) {
        query += ` AND c.severity = $${paramCount++}`;
        params.push(severity);
      }

      query += ` ORDER BY c.received_date DESC`;

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

// Get complaint by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('complaint', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT c.*, 
                u.first_name || ' ' || u.last_name as created_by_name,
                owner.first_name || ' ' || owner.last_name as owner_name
         FROM complaints c
         LEFT JOIN users u ON c.created_by = u.id
         LEFT JOIN users owner ON c.owner_id = owner.id
         WHERE c.id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Complaint not found', 404);
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

// Create complaint
router.post(
  '/',
  authenticate,
  checkPermission('complaint', 'create'),
  [
    body('received_date').isISO8601(),
    body('description').trim().notEmpty(),
    body('severity').isIn(['low', 'medium', 'high', 'critical']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        received_date,
        reported_by,
        contact_info,
        product_name,
        product_lot_batch,
        product_serial_number,
        description,
        severity,
        category,
        owner_id,
      } = req.body;

      // Generate complaint number
      const countResult = await pool.query('SELECT COUNT(*) as count FROM complaints');
      const count = parseInt(countResult.rows[0].count) + 1;
      const complaintNumber = `COMP-${String(count).padStart(5, '0')}`;

      const result = await pool.query(
        `INSERT INTO complaints 
         (complaint_number, received_date, reported_by, contact_info, product_name,
          product_lot_batch, product_serial_number, description, severity, category,
          owner_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'received', $12)
         RETURNING *`,
        [
          complaintNumber,
          received_date,
          reported_by || null,
          contact_info || null,
          product_name || null,
          product_lot_batch || null,
          product_serial_number || null,
          description,
          severity,
          category || null,
          owner_id || null,
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

// Get deviations
router.get(
  '/deviations',
  authenticate,
  checkPermission('complaint', 'read'),
  async (req, res, next) => {
    try {
      const { status } = req.query;
      let query = `
        SELECT d.*, 
               u.first_name || ' ' || u.last_name as created_by_name,
               owner.first_name || ' ' || owner.last_name as owner_name
        FROM deviations d
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN users owner ON d.owner_id = owner.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND d.status = $${paramCount++}`;
        params.push(status);
      }

      query += ` ORDER BY d.detected_date DESC`;

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

// Create deviation
router.post(
  '/deviations',
  authenticate,
  checkPermission('complaint', 'create'),
  [
    body('deviation_type').notEmpty(),
    body('detected_date').isISO8601(),
    body('description').trim().notEmpty(),
    body('deviation_from').trim().notEmpty(),
    body('severity').isIn(['low', 'medium', 'high', 'critical']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        deviation_type,
        detected_date,
        detected_by,
        location,
        product_lot_batch,
        description,
        specification_reference,
        deviation_from,
        impact_assessment,
        severity,
        owner_id,
      } = req.body;

      // Generate deviation number
      const countResult = await pool.query('SELECT COUNT(*) as count FROM deviations');
      const count = parseInt(countResult.rows[0].count) + 1;
      const deviationNumber = `DEV-${String(count).padStart(5, '0')}`;

      const result = await pool.query(
        `INSERT INTO deviations 
         (deviation_number, deviation_type, detected_date, detected_by, location,
          product_lot_batch, description, specification_reference, deviation_from,
          impact_assessment, severity, owner_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'initiated', $13)
         RETURNING *`,
        [
          deviationNumber,
          deviation_type,
          detected_date,
          detected_by || req.user!.id,
          location || null,
          product_lot_batch || null,
          description,
          specification_reference || null,
          deviation_from,
          impact_assessment || null,
          severity,
          owner_id || null,
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
