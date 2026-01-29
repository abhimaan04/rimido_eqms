/**
 * PM2 ecosystem config — run backend and frontend so they keep running
 * after you close the terminal. Use: npm run start:pm2
 * Uses Node runner scripts for Windows compatibility (avoids spawn EINVAL).
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'eqms-backend',
      script: path.join(__dirname, 'scripts', 'pm2-backend.js'),
      interpreter: 'node',
      cwd: __dirname,
      env: { NODE_ENV: 'development' },
      watch: false,
      max_restarts: 10,
      min_uptime: '5s',
    },
    {
      name: 'eqms-frontend',
      script: path.join(__dirname, 'scripts', 'pm2-frontend.js'),
      interpreter: 'node',
      cwd: __dirname,
      env: { NODE_ENV: 'development' },
      watch: false,
      max_restarts: 10,
      min_uptime: '5s',
    },
  ],
};
