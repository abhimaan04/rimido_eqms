import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticate, checkPermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { createElectronicSignature } from '../utils/electronicSignature';
import { generateCapaFiles } from '../utils/capaExport';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import bcrypt from 'bcryptjs';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 30,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new AppError('Only image files are allowed', 400));
  },
});

function parseJsonArray(input: any): any[] | null {
  if (!input) return null;
  if (Array.isArray(input)) return input;
  if (typeof input !== 'string') return null;
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonValue(input: any): any {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

type CapaDetailItem = {
  title: string;
  description: string;
  image_paths?: string[];
};

type CapaCustomTable = {
  rows: number;
  columns: number;
  data: string[][];
};

type ParsedApprover = {
  name: string;
  decision: 'approve' | 'disapprove' | null;
  password?: string;
};

function normalizeApprovers(input: any): ParsedApprover[] {
  let source = input;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = [];
    }
  }
  return (source || [])
    .map((item: any) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) return null;
        return { name: trimmed, decision: null };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) {
        return null;
      }

      const decision =
        item.decision === 'approve' || item.decision === 'disapprove'
          ? item.decision
          : null;

      const password =
        typeof item.password === 'string' && item.password.length > 0
          ? item.password
          : undefined;

      return { name, decision, password };
    })
    .filter((item: any) => item !== null);
}

function normalizeDetailItems(input: any[]): CapaDetailItem[] {
  return (input || [])
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      title: typeof item.title === 'string' ? item.title.trim() : '',
      description: typeof item.description === 'string' ? item.description.trim() : '',
      image_paths: Array.isArray(item.image_paths)
        ? item.image_paths.filter((p: any) => typeof p === 'string')
        : [],
    }))
    .filter((item: CapaDetailItem) => item.title.length > 0 && item.description.length > 0);
}

function normalizeCustomTable(input: any): CapaCustomTable | null {
  let source = input;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return null;
    }
  }
  if (!source || typeof source !== 'object') {
    return null;
  }

  const rowsRaw = Number((source as any).rows);
  const columnsRaw = Number((source as any).columns);
  if (!Number.isFinite(rowsRaw) || !Number.isFinite(columnsRaw)) {
    return null;
  }

  const rows = Math.min(20, Math.max(1, Math.floor(rowsRaw)));
  const columns = Math.min(12, Math.max(1, Math.floor(columnsRaw)));
  const sourceData = Array.isArray((source as any).data) ? (source as any).data : [];

  const data: string[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const sourceRow = Array.isArray(sourceData[r]) ? sourceData[r] : [];
    const row: string[] = [];
    for (let c = 0; c < columns; c += 1) {
      const value = sourceRow[c];
      row.push(typeof value === 'string' ? value : '');
    }
    data.push(row);
  }

  return { rows, columns, data };
}

async function saveCapaImages(capaId: string, files: Express.Multer.File[]): Promise<string[]> {
  if (!files || files.length === 0) {
    return [];
  }

  const imagesDir = path.resolve(__dirname, '../../..', 'uploads', 'capa', 'images', capaId);
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const saved: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const name = `${Date.now()}-${i}-${sanitizeFilename(file.originalname)}`;
    const fullPath = path.join(imagesDir, name);
    fs.writeFileSync(fullPath, file.buffer);
    saved.push(fullPath);
  }

  return saved;
}

const uploadsRoot = path.resolve(__dirname, '../../..', 'uploads');

function isInsideUploads(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  return resolved === uploadsRoot || resolved.startsWith(`${uploadsRoot}${path.sep}`);
}

function removeFileIfAllowed(filePath: string): 'deleted' | 'missing' | 'blocked' {
  if (!isInsideUploads(filePath)) {
    return 'blocked';
  }
  if (!fs.existsSync(filePath)) {
    return 'missing';
  }
  fs.unlinkSync(filePath);
  return 'deleted';
}

function countFilesInDirectory(dirPath: string): number {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let count = 0;
  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += countFilesInDirectory(fullPath);
    } else {
      count += 1;
    }
  });
  return count;
}

function collectCapaFilePaths(row: any): { filePaths: Set<string>; detailItems: CapaDetailItem[] } {
  const filePaths = new Set<string>();
  const capaBaseName = sanitizeFilename(String(row.capa_number || 'CAPA'));
  const defaultPdfPath = path.resolve(__dirname, '../../..', 'uploads', 'capa', `${capaBaseName}.pdf`);
  const defaultDocxPath = path.resolve(__dirname, '../../..', 'uploads', 'capa', `${capaBaseName}.docx`);

  if (typeof row.capa_pdf_path === 'string' && row.capa_pdf_path.length > 0) {
    filePaths.add(row.capa_pdf_path);
  }
  if (typeof row.capa_docx_path === 'string' && row.capa_docx_path.length > 0) {
    filePaths.add(row.capa_docx_path);
  }
  // Backward compatibility: files may exist at deterministic export paths even when DB columns are null.
  filePaths.add(defaultPdfPath);
  filePaths.add(defaultDocxPath);

  if (Array.isArray(row.capa_images)) {
    row.capa_images.forEach((p: any) => {
      if (typeof p === 'string' && p.length > 0) {
        filePaths.add(p);
      }
    });
  }

  const detailItems = normalizeDetailItems(row.detail_items || []);
  detailItems.forEach((item) => {
    (item.image_paths || []).forEach((p) => {
      if (typeof p === 'string' && p.length > 0) {
        filePaths.add(p);
      }
    });
  });

  return { filePaths, detailItems };
}

function removeCollectedFiles(rowId: string, filePaths: Set<string>): { deletedCount: number; missingCount: number; blockedCount: number } {
  let deletedCount = 0;
  let missingCount = 0;
  let blockedCount = 0;
  filePaths.forEach((filePath) => {
    const status = removeFileIfAllowed(filePath);
    if (status === 'deleted') deletedCount += 1;
    if (status === 'missing') missingCount += 1;
    if (status === 'blocked') blockedCount += 1;
  });

  // Also remove empty per-CAPA image directory when possible.
  const imageDir = path.resolve(__dirname, '../../..', 'uploads', 'capa', 'images', rowId);
  if (isInsideUploads(imageDir) && fs.existsSync(imageDir)) {
    try {
      const remainingFilesBeforeCleanup = countFilesInDirectory(imageDir);
      fs.rmSync(imageDir, { recursive: true, force: true });
      deletedCount += remainingFilesBeforeCleanup;
    } catch {
      // Non-fatal: file deletion result remains valid even if directory cleanup fails.
    }
  }

  return { deletedCount, missingCount, blockedCount };
}

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
          AND c.status != 'deleted'
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
  upload.any(),
  [
    body('title').trim().notEmpty(),
    body('type').isIn(['corrective', 'preventive']),
    body('source').notEmpty(),
    body('priority').isIn(['low', 'medium', 'high', 'critical']),
    body('description').trim().notEmpty(),
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
      } = req.body;

      const approversRaw = parseJsonArray(req.body.approvers);
      const customFieldsRaw = parseJsonArray(req.body.custom_fields);
      const detailItemsRaw = parseJsonArray(req.body.detail_items);
      const customTableRaw = parseJsonValue(req.body.custom_table);

      const parsedApprovers = normalizeApprovers(approversRaw || []);
      const approversNeedingPassword = parsedApprovers.filter((approver) => approver.decision !== null);
      if (approversNeedingPassword.length > 0) {
        const userResult = await pool.query(
          'SELECT password_hash FROM users WHERE id = $1',
          [req.user!.id]
        );
        if (userResult.rows.length === 0) {
          throw new AppError('User account not found', 404);
        }

        const passwordHash = userResult.rows[0].password_hash;
        for (const approver of approversNeedingPassword) {
          if (!approver.password) {
            throw new AppError(`Password is required for approver "${approver.name}"`, 400);
          }
          const validPassword = await bcrypt.compare(approver.password, passwordHash);
          if (!validPassword) {
            throw new AppError('Invalid approval password', 400);
          }
        }
      }

      const approvers = parsedApprovers.map((approver) => ({
        name: approver.name,
        decision: approver.decision,
      }));

      const custom_fields = (customFieldsRaw || [])
        .filter((item) => item && typeof item === 'object')
        .map((item: any) => ({
          label: typeof item.label === 'string' ? item.label.trim() : '',
          value: typeof item.value === 'string' ? item.value : '',
        }))
        .filter((item) => item.label.length > 0);
      const custom_table = normalizeCustomTable(customTableRaw);

      let detail_items = normalizeDetailItems(detailItemsRaw || []);
      if (detail_items.length === 0) {
        const fallbackTitle = typeof title === 'string' ? title.trim() : '';
        const fallbackDescription = typeof description === 'string' ? description.trim() : '';
        if (fallbackTitle && fallbackDescription) {
          detail_items = [{ title: fallbackTitle, description: fallbackDescription, image_paths: [] }];
        }
      }

      if (detail_items.length === 0) {
        throw new AppError('At least one CAPA detail item is required', 400);
      }

      const primaryTitle = typeof title === 'string' ? title.trim() : '';
      const primaryDescription = typeof description === 'string' ? description.trim() : '';

      // Generate CAPA number
      const countResult = await pool.query('SELECT COUNT(*) as count FROM capa');
      const count = parseInt(countResult.rows[0].count) + 1;
      const capaNumber = `CAPA-${String(count).padStart(5, '0')}`;

      const approversJson = approvers.length > 0 ? JSON.stringify(approvers) : null;
      const customFieldsJson = custom_fields.length > 0 ? JSON.stringify(custom_fields) : null;
      const customTableJson = custom_table ? JSON.stringify(custom_table) : null;

      const modernInsertValues = [
        capaNumber,
        primaryTitle,
        type,
        source,
        source_reference_id || null,
        priority,
        primaryDescription,
        owner_id || null,
        assigned_to || null,
        target_completion_date || null,
        approversJson,
        customFieldsJson,
        customTableJson,
        req.user!.id,
      ];

      let result;
      try {
        result = await pool.query(
          `INSERT INTO capa 
           (capa_number, title, type, source, source_reference_id, priority, description,
            owner_id, assigned_to, target_completion_date, approvers, custom_fields, custom_table, status, created_by)
           VALUES (
             $1,  -- capa_number
             $2,  -- title
             $3,  -- type
             $4,  -- source
             $5,  -- source_reference_id
             $6,  -- priority
             $7,  -- description
             $8,  -- owner_id
             $9,  -- assigned_to
             $10, -- target_completion_date
             $11::jsonb, -- approvers
             $12::jsonb, -- custom_fields
             $13::jsonb, -- custom_table
             'initiated',
             $14  -- created_by
           )
           RETURNING *`,
          modernInsertValues
        );
      } catch (dbError: any) {
        // Backward compatibility for databases that do not have approvers/custom_fields yet.
        if (dbError?.code !== '42703') {
          throw dbError;
        }
        result = await pool.query(
          `INSERT INTO capa 
           (capa_number, title, type, source, source_reference_id, priority, description,
            owner_id, assigned_to, target_completion_date, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'initiated', $11)
           RETURNING *`,
          [
            capaNumber,
            primaryTitle,
            type,
            source,
            source_reference_id || null,
            priority,
            primaryDescription,
            owner_id || null,
            assigned_to || null,
            target_completion_date || null,
            req.user!.id,
          ]
        );
      }

      const created = result.rows[0];
      const allFiles = (req.files as Express.Multer.File[]) || [];
      const detailImageMap = new Map<number, Express.Multer.File[]>();
      allFiles.forEach((file) => {
        const detailMatch = /^detail_images_(\d+)$/.exec(file.fieldname);
        if (detailMatch) {
          const index = parseInt(detailMatch[1], 10);
          const existing = detailImageMap.get(index) || [];
          existing.push(file);
          detailImageMap.set(index, existing);
          return;
        }

        // Backward compatibility for old frontend payload that sent images[]
        if (file.fieldname === 'images') {
          const existing = detailImageMap.get(0) || [];
          existing.push(file);
          detailImageMap.set(0, existing);
        }
      });

      const detailItemsWithImages: CapaDetailItem[] = [];
      for (let i = 0; i < detail_items.length; i += 1) {
        const filesForDetail = detailImageMap.get(i) || [];
        const savedPaths = await saveCapaImages(created.id, filesForDetail);
        detailItemsWithImages.push({
          ...detail_items[i],
          image_paths: savedPaths,
        });
      }
      const imagePaths = detailItemsWithImages.flatMap((item) => item.image_paths || []);

      const { pdfPath, docxPath } = await generateCapaFiles({
        capa_number: created.capa_number,
        title: created.title,
        type: created.type,
        source: created.source,
        priority: created.priority,
        status: created.status,
        description: created.description,
        target_completion_date: created.target_completion_date,
        approvers,
        custom_fields,
        custom_table: custom_table || created.custom_table || null,
        image_paths: imagePaths,
        detail_items: detailItemsWithImages,
      });

      let responseData: any = {
        ...created,
        capa_pdf_path: pdfPath,
        capa_docx_path: docxPath,
        capa_images: imagePaths,
      };
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

      if (detailItemsWithImages.length > 0) {
        try {
          const detailsUpdate = await pool.query(
            `UPDATE capa
             SET detail_items = $1::jsonb
             WHERE id = $2
             RETURNING *`,
            [JSON.stringify(detailItemsWithImages), created.id]
          );
          responseData = detailsUpdate.rows[0];
        } catch (dbError: any) {
          // Backward compatibility for databases that do not have detail_items yet.
          if (dbError?.code !== '42703') {
            throw dbError;
          }
          responseData = {
            ...responseData,
            detail_items: detailItemsWithImages,
          };
        }
      }

      if (custom_table) {
        try {
          const tableUpdate = await pool.query(
            `UPDATE capa
             SET custom_table = $1::jsonb
             WHERE id = $2
             RETURNING *`,
            [JSON.stringify(custom_table), created.id]
          );
          responseData = tableUpdate.rows[0];
        } catch (dbError: any) {
          // Backward compatibility for databases that do not have custom_table yet.
          if (dbError?.code !== '42703') {
            throw dbError;
          }
          responseData = {
            ...responseData,
            custom_table,
          };
        }
      }

      if (imagePaths.length > 0) {
        try {
          const imageUpdate = await pool.query(
            `UPDATE capa
             SET capa_images = $1::jsonb
             WHERE id = $2
             RETURNING *`,
            [JSON.stringify(imagePaths), created.id]
          );
          responseData = imageUpdate.rows[0];
        } catch (dbError: any) {
          // Backward compatibility for databases that do not have capa_images yet.
          if (dbError?.code !== '42703') {
            throw dbError;
          }
          responseData = {
            ...responseData,
            capa_images: imagePaths,
          };
        }
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

const removeCapaFilesHandler = async (req: any, res: any, next: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM capa WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('CAPA not found', 404);
    }

    const row = result.rows[0];
    const { filePaths, detailItems } = collectCapaFilePaths(row);
    const { deletedCount, missingCount, blockedCount } = removeCollectedFiles(row.id, filePaths);

    let responseData = row;
    try {
      const clearedDetailItems =
        detailItems.length > 0
          ? detailItems.map((item) => ({ ...item, image_paths: [] as string[] }))
          : null;

      const updated = await pool.query(
        `UPDATE capa
         SET capa_pdf_path = NULL,
             capa_docx_path = NULL,
             capa_images = NULL,
             detail_items = COALESCE($1, detail_items),
             updated_by = $2
         WHERE id = $3
         RETURNING *`,
        [clearedDetailItems, req.user!.id, row.id]
      );
      responseData = updated.rows[0];
    } catch (dbError: any) {
      // Backward compatibility when new columns are not present yet.
      if (dbError?.code !== '42703') {
        throw dbError;
      }
    }

    res.json({
      success: true,
      message: 'CAPA files removed',
      data: {
        capa: responseData,
        deleted_files: deletedCount,
        missing_files: missingCount,
        blocked_files: blockedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Remove CAPA files (pdf/docx/images)
router.delete(
  '/:id/files',
  authenticate,
  checkPermission('capa', 'update'),
  removeCapaFilesHandler
);

// Compatibility route for environments blocking DELETE requests
router.post(
  '/:id/files/remove',
  authenticate,
  checkPermission('capa', 'update'),
  removeCapaFilesHandler
);

const deleteCapaHandler = async (req: any, res: any, next: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM capa WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('CAPA not found', 404);
    }

    const row = result.rows[0];
    const { filePaths, detailItems } = collectCapaFilePaths(row);
    const { deletedCount, missingCount, blockedCount } = removeCollectedFiles(row.id, filePaths);

    let deletedCapa;
    try {
      const clearedDetailItems =
        detailItems.length > 0
          ? detailItems.map((item) => ({ ...item, image_paths: [] as string[] }))
          : null;

      const updated = await pool.query(
        `UPDATE capa
         SET status = 'deleted',
             capa_pdf_path = NULL,
             capa_docx_path = NULL,
             capa_images = NULL,
             detail_items = COALESCE($1, detail_items),
             updated_by = $2
         WHERE id = $3
         RETURNING *`,
        [clearedDetailItems, req.user!.id, row.id]
      );
      deletedCapa = updated.rows[0];
    } catch (dbError: any) {
      // Backward compatibility when new columns are not present yet.
      if (dbError?.code !== '42703') {
        throw dbError;
      }
      const fallback = await pool.query(
        `UPDATE capa
         SET status = 'deleted',
             updated_by = $1
         WHERE id = $2
         RETURNING *`,
        [req.user!.id, row.id]
      );
      deletedCapa = fallback.rows[0];
    }

    res.json({
      success: true,
      message: 'CAPA deleted',
      data: {
        capa: deletedCapa,
        deleted_files: deletedCount,
        missing_files: missingCount,
        blocked_files: blockedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete CAPA (soft delete + remove files)
router.delete(
  '/:id',
  authenticate,
  checkPermission('capa', 'update'),
  deleteCapaHandler
);

// Compatibility route for environments blocking DELETE requests
router.post(
  '/:id/delete',
  authenticate,
  checkPermission('capa', 'update'),
  deleteCapaHandler
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
      const exportData = {
        capa_number: row.capa_number,
        title: row.title,
        type: row.type,
        source: row.source,
        priority: row.priority,
        status: row.status,
        description: row.description,
        target_completion_date: row.target_completion_date,
        approvers: normalizeApprovers(row.approvers || []).map((approver) => ({
          name: approver.name,
          decision: approver.decision,
        })),
        custom_fields: row.custom_fields || [],
        custom_table: normalizeCustomTable(row.custom_table || null),
        image_paths: row.capa_images || [],
        detail_items: normalizeDetailItems(row.detail_items || []),
      };

      // Always regenerate exports from current CAPA data so files
      // reflect the latest form content and stale files are overwritten.
      const regenerated = await generateCapaFiles(exportData);
      let pdfPath = regenerated.pdfPath;
      let docxPath = regenerated.docxPath;

      try {
        const updated = await pool.query(
          `UPDATE capa
           SET capa_pdf_path = $1,
               capa_docx_path = $2
           WHERE id = $3
           RETURNING capa_pdf_path, capa_docx_path`,
          [pdfPath, docxPath, row.id]
        );
        const updatedRow = updated.rows[0];
        pdfPath = updatedRow.capa_pdf_path || pdfPath;
        docxPath = updatedRow.capa_docx_path || docxPath;
      } catch (dbError: any) {
        // Backward compatibility for databases missing export path columns.
        if (dbError?.code !== '42703') {
          throw dbError;
        }
      }

      const filePath = type === 'pdf' ? pdfPath : docxPath;

      if (!filePath || !fs.existsSync(filePath)) {
        throw new AppError('CAPA file not found', 404);
      }

      const filenameBase = row.capa_number || 'CAPA';
      const filename = `${filenameBase}.${type}`;
      res.setHeader('Cache-Control', 'no-store');
      res.download(path.resolve(filePath), filename);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
