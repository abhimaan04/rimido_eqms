const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const email = 'admin@remidio.com';
  const password = 'Admin123!';
  
  // Generate password hash
  const passwordHash = await bcrypt.hash(password, 12);
  
  console.log('\n=== Admin User Setup ===\n');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('\nPassword Hash (copy this):');
  console.log(passwordHash);
  console.log('\n=== SQL Commands ===\n');
  console.log('Run these SQL commands in your PostgreSQL database:\n');
  console.log(`-- Update or insert admin user`);
  console.log(`INSERT INTO users (email, password_hash, first_name, last_name, employee_id, is_active, is_locked, failed_login_attempts)`);
  console.log(`VALUES (`);
  console.log(`  '${email}',`);
  console.log(`  '${passwordHash}',`);
  console.log(`  'Admin',`);
  console.log(`  'User',`);
  console.log(`  'EMP001',`);
  console.log(`  true,`);
  console.log(`  false,`);
  console.log(`  0`);
  console.log(`)`);
  console.log(`ON CONFLICT (email) DO UPDATE SET`);
  console.log(`  password_hash = EXCLUDED.password_hash,`);
  console.log(`  is_active = true,`);
  console.log(`  is_locked = false,`);
  console.log(`  failed_login_attempts = 0;`);
  console.log(`\n-- Assign Quality Manager role`);
  console.log(`INSERT INTO user_roles (user_id, role_id)`);
  console.log(`SELECT u.id, r.id`);
  console.log(`FROM users u, roles r`);
  console.log(`WHERE u.email = '${email}' AND r.name = 'Quality Manager'`);
  console.log(`ON CONFLICT DO NOTHING;`);
  console.log('\n');
}

createAdminUser().catch(console.error);
