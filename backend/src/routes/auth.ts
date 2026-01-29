import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { AppError } from '../errors/AppError';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Register new user (admin only)
router.post(
  '/register',
  authenticate,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, first_name, last_name, employee_id, department, job_title } = req.body;

      // Check if user exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw new AppError('User already exists', 400);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, employee_id, department, job_title, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, first_name, last_name, created_at`,
        [email, passwordHash, first_name, last_name, employee_id, department, job_title, req.user!.id]
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

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const userResult = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.is_active, u.is_locked, u.failed_login_attempts,
                ARRAY_AGG(r.name) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.email = $1
         GROUP BY u.id, u.email, u.password_hash, u.is_active, u.is_locked, u.failed_login_attempts`,
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('Invalid credentials', 401);
      }

      const user = userResult.rows[0];

      // Check if account is locked
      if (user.is_locked) {
        throw new AppError('Account is locked. Please contact administrator.', 401);
      }

      // Check if account is active
      if (!user.is_active) {
        throw new AppError('Account is inactive', 401);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        // Increment failed login attempts
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        const shouldLock = newAttempts >= 5;

        await pool.query(
          `UPDATE users 
           SET failed_login_attempts = $1, is_locked = $2
           WHERE id = $3`,
          [newAttempts, shouldLock, user.id]
        );

        throw new AppError('Invalid credentials', 401);
      }

      // Reset failed login attempts and update last login
      await pool.query(
        `UPDATE users 
         SET failed_login_attempts = 0, last_login = NOW()
         WHERE id = $1`,
        [user.id]
      );

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          roles: user.roles.filter(Boolean),
        },
        process.env.JWT_SECRET as string,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            roles: user.roles.filter(Boolean),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.employee_id, u.department, u.job_title,
              ARRAY_AGG(r.name) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.employee_id, u.department, u.job_title`,
      [req.user!.id]
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
});

// Change password
router.post(
  '/change-password',
  authenticate,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { current_password, new_password } = req.body;

      // Get current user
      const userResult = await pool.query(
        'SELECT id, password_hash FROM users WHERE id = $1',
        [req.user!.id]
      );

      const user = userResult.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
      if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(new_password, 12);

      // Update password
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, password_changed_at = NOW(), failed_login_attempts = 0
         WHERE id = $2`,
        [newPasswordHash, req.user!.id]
      );

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
