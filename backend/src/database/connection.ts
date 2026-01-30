import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from project root .env
// When running from backend/, default dotenv lookup will miss the root .env,
// so we explicitly point to it.
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

// Prefer DATABASE_URL in production (Render/Neon/Supabase), fallback to DB_* for local dev.
const connectionString = process.env.DATABASE_URL;

// Log connection info (without exposing password)
if (process.env.NODE_ENV === 'production') {
  if (connectionString) {
    const url = new URL(connectionString);
    console.log(`📊 Connecting to database: ${url.hostname}:${url.port || 5432}/${url.pathname.slice(1)}`);
  } else {
    console.warn('⚠️  DATABASE_URL not set! Falling back to DB_HOST/DB_USER/etc. (may fail in production)');
  }
}

// Normalize database password to always be a string (as required by pg + SCRAM)
const rawPassword = process.env.DB_PASSWORD;
const dbPassword =
  typeof rawPassword === 'string'
    ? rawPassword
    : rawPassword === undefined || rawPassword === null
      ? undefined
      : String(rawPassword);

const pool = new Pool({
  ...(connectionString
    ? {
        connectionString,
        // Many hosted Postgres providers require SSL; allow opt-out via DB_SSL=false
        ssl:
          process.env.DB_SSL === 'false'
            ? undefined
            : process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : undefined,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'eqms',
        user: process.env.DB_USER || 'postgres',
        password: dbPassword,
      }),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('📊 Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    await pool.query('SELECT NOW()');

    // Check if core tables already exist to avoid re-running schema
    const usersTableCheck = await pool.query(
      "SELECT to_regclass('public.users') as exists"
    );

    if (!usersTableCheck.rows[0]?.exists) {
      // Run schema creation only on first initialization
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await pool.query(schema);
        console.log('✅ Database schema initialized');
      }
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export { pool };
export type { PoolClient };
