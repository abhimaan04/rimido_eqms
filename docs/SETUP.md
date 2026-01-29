# Remidio eQMS Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb eqms

# Or using psql:
psql -U postgres
CREATE DATABASE eqms;
\q
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# Update:
# - DATABASE_URL
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - JWT_SECRET (generate a strong random string)
# - ENCRYPTION_KEY (32 characters)
```

### 4. Initialize Database Schema

```bash
cd backend
npm run migrate
```

This will:
- Create all tables
- Set up triggers
- Insert default roles and permissions

### 5. Start Development Servers

```bash
# From project root
npm run dev
```

This starts:
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

## Docker Setup (Alternative)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Initial User Setup

After database initialization, create your first admin user:

```bash
# Using psql or pgAdmin
psql -U postgres -d eqms

# Insert admin user (password: Admin123!)
INSERT INTO users (email, password_hash, first_name, last_name, employee_id, is_active)
VALUES (
  'admin@remidio.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5', -- bcrypt hash of 'Admin123!'
  'Admin',
  'User',
  'EMP001',
  true
);

# Assign Quality Manager role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@remidio.com' AND r.name = 'Quality Manager';
```

**Note:** Change the password hash above. Generate a new hash using:
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('YourPassword123!', 12).then(console.log);
```

## Verification

1. Open http://localhost:3000
2. Login with admin credentials
3. Verify dashboard loads with all modules
4. Check API health: http://localhost:3001/health

## Production Deployment

### Backend

1. Set `NODE_ENV=production`
2. Use strong, unique values for `JWT_SECRET` and `ENCRYPTION_KEY`
3. Configure SSL/TLS for database connections
4. Set up reverse proxy (nginx) for API
5. Enable rate limiting
6. Configure backup strategy for PostgreSQL

### Frontend

1. Build: `cd frontend && npm run build`
2. Set `NEXT_PUBLIC_API_URL` to production API URL
3. Deploy to Vercel, AWS, or similar
4. Configure HTTPS

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Change default ENCRYPTION_KEY
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable audit trail (AUDIT_ENABLED=true)
- [ ] Review and configure role permissions
- [ ] Set up monitoring and alerting

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d eqms -c "SELECT NOW();"
```

### Port Already in Use

```bash
# Change ports in .env
PORT=3002  # Backend
# In frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Migration Errors

```bash
# Drop and recreate database (WARNING: Deletes all data)
dropdb eqms
createdb eqms
cd backend && npm run migrate
```

## Support

For issues or questions, contact the Remidio IT team.
