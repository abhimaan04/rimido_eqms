import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, checkPermission } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

// Get all training programs
router.get(
  '/programs',
  authenticate,
  checkPermission('training', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT * FROM training_programs 
         WHERE is_active = true
         ORDER BY title`
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

// Get training records
router.get(
  '/records',
  authenticate,
  checkPermission('training', 'read'),
  async (req, res, next) => {
    try {
      const { user_id, program_id, status } = req.query;
      let query = `
        SELECT tr.*, 
               tp.title as program_title,
               tp.program_code,
               u.first_name || ' ' || u.last_name as user_name,
               trainer.first_name || ' ' || trainer.last_name as trainer_name
        FROM training_records tr
        JOIN training_programs tp ON tr.program_id = tp.id
        JOIN users u ON tr.user_id = u.id
        LEFT JOIN users trainer ON tr.trainer_id = trainer.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (user_id) {
        query += ` AND tr.user_id = $${paramCount++}`;
        params.push(user_id);
      }
      if (program_id) {
        query += ` AND tr.program_id = $${paramCount++}`;
        params.push(program_id);
      }
      if (status) {
        query += ` AND tr.status = $${paramCount++}`;
        params.push(status);
      }

      query += ` ORDER BY tr.training_date DESC`;

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

// Create training record
router.post(
  '/records',
  authenticate,
  checkPermission('training', 'create'),
  [
    body('user_id').isUUID(),
    body('program_id').isUUID(),
    body('training_date').isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        user_id,
        program_id,
        training_date,
        training_method,
        trainer_id,
        passing_score,
      } = req.body;

      // Get program validity
      const programResult = await pool.query(
        'SELECT validity_months FROM training_programs WHERE id = $1',
        [program_id]
      );

      if (programResult.rows.length === 0) {
        throw new AppError('Training program not found', 404);
      }

      const validityMonths = programResult.rows[0].validity_months;
      const expiryDate = validityMonths
        ? new Date(training_date)
        : null;
      if (expiryDate && validityMonths) {
        expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
      }

      const result = await pool.query(
        `INSERT INTO training_records 
         (user_id, program_id, training_date, training_method, trainer_id, 
          passing_score, expiry_date, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8)
         RETURNING *`,
        [
          user_id,
          program_id,
          training_date,
          training_method || null,
          trainer_id || null,
          passing_score || 70.00,
          expiryDate,
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

// Update training record (complete training)
router.put(
  '/records/:id',
  authenticate,
  checkPermission('training', 'update'),
  async (req, res, next) => {
    try {
      const { completion_date, score, status, certificate_file_path, notes } = req.body;

      const result = await pool.query(
        `UPDATE training_records 
         SET completion_date = COALESCE($1, completion_date),
             score = COALESCE($2, score),
             status = COALESCE($3, status),
             certificate_file_path = COALESCE($4, certificate_file_path),
             notes = COALESCE($5, notes)
         WHERE id = $6
         RETURNING *`,
        [completion_date, score, status, certificate_file_path, notes, req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Training record not found', 404);
      }

      // Update status based on score if completed
      if (status === 'completed' && score !== null) {
        const record = result.rows[0];
        const passed = score >= (record.passing_score || 70.00);
        await pool.query(
          `UPDATE training_records SET status = $1 WHERE id = $2`,
          [passed ? 'completed' : 'failed', req.params.id]
        );
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

export default router;
