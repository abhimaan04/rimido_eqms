import { initializeDatabase } from './connection';

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    await initializeDatabase();
    console.log('✅ Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
