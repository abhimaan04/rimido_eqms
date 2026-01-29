/**
 * PM2 runner for frontend — Windows-friendly (uses shell so npx is found)
 */
const { spawn } = require('child_process');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');
const args = ['next', 'dev'];

const child = spawn('npx', args, {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' },
});

child.on('error', (err) => {
  console.error('Frontend failed to start:', err);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code || 0));
