import express from 'express';
import { pool } from '../database/connection';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  getDocumentSignatures,
  verifyElectronicSignature,
} from '../utils/electronicSignature';

const router = express.Router();

// Get signatures for a document
router.get(
  '/document/:documentType/:documentId',
  authenticate,
  async (req, res, next) => {
    try {
      const { documentType, documentId } = req.params;

      const signatures = await getDocumentSignatures(documentType, documentId);

      res.json({
        success: true,
        data: signatures,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify signature
router.get(
  '/:id/verify',
  authenticate,
  async (req, res, next) => {
    try {
      const isValid = await verifyElectronicSignature(req.params.id);

      res.json({
        success: true,
        data: {
          signature_id: req.params.id,
          is_valid: isValid,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get signature details
router.get(
  '/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT es.*, u.email, u.first_name, u.last_name
         FROM electronic_signatures es
         JOIN users u ON es.user_id = u.id
         WHERE es.id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Signature not found', 404);
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
