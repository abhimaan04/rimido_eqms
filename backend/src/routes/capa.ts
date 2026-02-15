import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, checkPermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { createElectronicSignature } from '../utils/electronicSignature';
import { generateCapaFiles } from '../utils/capaExport';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Get all CAPA records
router.get(
  '/',
  authenticate,
  checkPermission('capa', 'read'),
  async (req, res, next) => {
    try {
      const { status, type, priority } = req.query;
      let query = `
        SELECT c.*, 
               u1.first_name || ' ' || u1.last_name as created_by_name,
               u2.first_name || ' ' || u2.last_name as owner_name
        FROM capa c
        LEFT JOIN users u1 ON c.created_by = u1.id
        LEFT JOIN users u2 ON c.owner_id = u2.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND c.status = $${paramCount++}`;
        params.push(status);
      }
      if (type) {
        query += ` AND c.type = $${paramCount++}`;
        params.push(type);
      }
      if (priority) {
        query += ` AND c.priority = $${paramCount++}`;
        params.push(priority);
      }

      query += ` ORDER BY c.created_at DESC`;

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

// Get CAPA by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('capa', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT c.*, 
                u1.first_name || ' ' || u1.last_name as created_by_name,
                u2.first_name || ' ' || u2.last_name as owner_name
         FROM capa c
         LEFT JOIN users u1 ON c.created_by = u1.id
         LEFT JOIN users u2 ON c.owner_id = u2.id
         WHERE c.id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('CAPA not found', 404);
      }

      // Get actions
      const actionsResult = await pool.query(
        `SELECT ca.*, u.first_name || ' ' || u.last_name as responsible_name
         FROM capa_actions ca
         LEFT JOIN users u ON ca.responsible_person_id = u.id
         WHERE ca.capa_id = $1
         ORDER BY ca.created_at`,
        [req.params.id]
      );

      // Get approvals
      const approvalsResult = await pool.query(
        `SELECT ca.*, u.first_name || ' ' || u.last_name as approver_name
         FROM capa_approvals ca
         JOIN users u ON ca.approver_id = u.id
         WHERE ca.capa_id = $1
         ORDER BY ca.approval_type, ca.created_at`,
        [req.params.id]
      );

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          actions: actionsResult.rows,
          approvals: approvalsResult.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create CAPA
router.post(
  '/',
  authenticate,
  checkPermission('capa', 'create'),
  [
    body('title').trim().notEmpty(),
    body('type').isIn(['corrective', 'preventive']),
    body('source').notEmpty(),
    body('priority').isIn(['low', 'medium', 'high', 'critical']),
    body('description').trim().notEmpty(),
    body('approvers').optional().isArray(),
    body('custom_fields').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        type,
        source,
        source_reference_id,
        priority,
        description,
        owner_id,
        assigned_to,
        target_completion_date,
        approvers,
        custom_fields,
      } = req.body;

      // Generate CAPA number
      const countResult = await pool.query('SELECT COUNT(*) as count FROM capa');
      const count = parseInt(countResult.rows[0].count) + 1;
      const capaNumber = `CAPA-${String(count).padStart(5, '0')}`;

      const result = await pool.query(
        `INSERT INTO capa 
         (capa_number, title, type, source, source_reference_id, priority, description,
          owner_id, assigned_to, target_completion_date, approvers, custom_fields, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'initiated', $13)
         RETURNING *`,
        [
          capaNumber,
          title,
          type,
          source,
          source_reference_id || null,
          priority,
          description,
          owner_id || null,
          assigned_to || null,
          target_completion_date || null,
          approvers && Array.isArray(approvers) ? approvers : null,
          custom_fields && Array.isArray(custom_fields) ? custom_fields : null,
          req.user!.id,
        ]
      );

      const created = result.rows[0];
      const { pdfPath, docxPath } = await generateCapaFiles({
        capa_number: created.capa_number,
        title: created.title,
        type: created.type,
        source: created.source,
        priority: created.priority,
        status: created.status,
        description: created.description,
        target_completion_date: created.target_completion_date,
        approvers: created.approvers || [],
        custom_fields: created.custom_fields || [],
      });

      let responseData = created;
      try {
        const updateResult = await pool.query(
          `UPDATE capa
           SET capa_pdf_path = $1,
               capa_docx_path = $2
           WHERE id = $3
           RETURNING *`,
          [pdfPath, docxPath, created.id]
        );
        responseData = updateResult.rows[0];
      } catch (dbError: any) {
        // Backward compatibility for databases that have not run the new migration yet.
        if (dbError?.code !== '42703') {
          throw dbError;
        }
        responseData = {
          ...created,
          capa_pdf_path: pdfPath,
          capa_docx_path: docxPath,
        };
      }

      res.status(201).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update CAPA
router.put(
  '/:id',
  authenticate,
  checkPermission('capa', 'update'),
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        root_cause_analysis,
        action_plan,
        effectiveness_criteria,
        target_completion_date,
        status,
      } = req.body;

      const result = await pool.query(
        `UPDATE capa 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             root_cause_analysis = COALESCE($3, root_cause_analysis),
             action_plan = COALESCE($4, action_plan),
             effectiveness_criteria = COALESCE($5, effectiveness_criteria),
             target_completion_date = COALESCE($6, target_completion_date),
             status = COALESCE($7, status),
             updated_by = $8
         WHERE id = $9
         RETURNING *`,
        [
          title,
          description,
          root_cause_analysis,
          action_plan,
          effectiveness_criteria,
          target_completion_date,
          status,
          req.user!.id,
          req.params.id,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError('CAPA not found', 404);
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

// Add action to CAPA
router.post(
  '/:id/actions',
  authenticate,
  checkPermission('capa', 'update'),
  [body('action_description').trim().notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { action_description, responsible_person_id, due_date } = req.body;

      const result = await pool.query(
        `INSERT INTO capa_actions 
         (capa_id, action_description, responsible_person_id, due_date, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [req.params.id, action_description, responsible_person_id || null, due_date || null]
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

// Download CAPA files
router.get(
  '/:id/download',
  authenticate,
  checkPermission('capa', 'read'),
  async (req, res, next) => {
    try {
      const { type } = req.query;
      if (type !== 'pdf' && type !== 'docx') {
        throw new AppError('Invalid file type requested', 400);
      }

      const result = await pool.query(
        `SELECT * FROM capa WHERE id = $1`,
        [req.params.id]
      );
      if (result.rows.length === 0) {
        throw new AppError('CAPA not found', 404);
      }

      const row = result.rows[0];
      let filePath = type === 'pdf' ? row.capa_pdf_path : row.capa_docx_path;
      if (!filePath || !fs.existsSync(filePath)) {
        const regenerated = await generateCapaFiles({
          capa_number: row.capa_number,
          title: row.title,
          type: row.type,
          source: row.source,
          priority: row.priority,
          status: row.status,
          description: row.description,
          target_completion_date: row.target_completion_date,
          approvers: row.approvers || [],
          custom_fields: row.custom_fields || [],
        });

        filePath = type === 'pdf' ? regenerated.pdfPath : regenerated.docxPath;
        try {
          const updated = await pool.query(
            `UPDATE capa
             SET capa_pdf_path = $1,
                 capa_docx_path = $2
             WHERE id = $3
             RETURNING capa_pdf_path, capa_docx_path`,
            [regenerated.pdfPath, regenerated.docxPath, row.id]
          );
          const updatedRow = updated.rows[0];
          filePath = type === 'pdf' ? updatedRow.capa_pdf_path : updatedRow.capa_docx_path;
        } catch (dbError: any) {
          // Backward compatibility for databases missing export path columns.
          if (dbError?.code !== '42703') {
            throw dbError;
          }
        }
      }

      if (!filePath || !fs.existsSync(filePath)) {
        throw new AppError('CAPA file not found', 404);
      }

      const filenameBase = row.capa_number || 'CAPA';
      const filename = `${filenameBase}.${type}`;
      res.download(path.resolve(filePath), filename);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
