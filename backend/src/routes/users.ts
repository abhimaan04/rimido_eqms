import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, authorize, checkPermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';

const router = express.Router();

// Get all users
router.get(
  '/',
  authenticate,
  checkPermission('users', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.employee_id, 
                u.department, u.job_title, u.is_active, u.is_locked, u.last_login,
                ARRAY_AGG(r.name) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         GROUP BY u.id, u.email, u.first_name, u.last_name, u.employee_id, 
                  u.department, u.job_title, u.is_active, u.is_locked, u.last_login
         ORDER BY u.last_name, u.first_name`
      );

      res.json({
        success: true,
        data: result.rows.map((row) => ({
          ...row,
          roles: row.roles.filter(Boolean),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('users', 'read'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.employee_id,
                u.department, u.job_title, u.is_active, u.is_locked, u.last_login,
                ARRAY_AGG(r.name) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.id = $1
         GROUP BY u.id, u.email, u.first_name, u.last_name, u.employee_id,
                  u.department, u.job_title, u.is_active, u.is_locked, u.last_login`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          roles: result.rows[0].roles.filter(Boolean),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Assign role to user
router.post(
  '/:id/roles',
  authenticate,
  checkPermission('users', 'update'),
  [body('role_id').isUUID()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role_id } = req.body;
      const userId = req.params.id;

      // Check if user exists
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      // Check if role exists
      const roleCheck = await pool.query('SELECT id FROM roles WHERE id = $1', [role_id]);
      if (roleCheck.rows.length === 0) {
        throw new AppError('Role not found', 404);
      }

      // Assign role
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, role_id, req.user!.id]
      );

      res.json({
        success: true,
        message: 'Role assigned successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Remove role from user
router.delete(
  '/:id/roles/:roleId',
  authenticate,
  checkPermission('users', 'update'),
  async (req, res, next) => {
    try {
      await pool.query(
        'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [req.params.id, req.params.roleId]
      );

      res.json({
        success: true,
        message: 'Role removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user
router.put(
  '/:id',
  authenticate,
  checkPermission('users', 'update'),
  async (req, res, next) => {
    try {
      const { first_name, last_name, department, job_title, is_active, is_locked } = req.body;

      const result = await pool.query(
        `UPDATE users 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             department = COALESCE($3, department),
             job_title = COALESCE($4, job_title),
             is_active = COALESCE($5, is_active),
             is_locked = COALESCE($6, is_locked),
             updated_by = $7
         WHERE id = $8
         RETURNING id, email, first_name, last_name, department, job_title, is_active, is_locked`,
        [first_name, last_name, department, job_title, is_active, is_locked, req.user!.id, req.params.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
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
