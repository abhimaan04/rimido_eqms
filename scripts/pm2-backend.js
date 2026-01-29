/**
 * PM2 runner for backend — Windows-friendly (uses shell so npx is found)
 */
const { spawn } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend');
const args = ['tsx', 'watch', 'src/server.ts'];

const child = spawn('npx', args, {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' },
});

child.on('error', (err) => {
  console.error('Backend failed to start:', err);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code || 0));
