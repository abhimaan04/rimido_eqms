# eQMS Architecture Documentation

## System Overview

The Remidio eQMS is a full-stack web application designed for medical device quality management, compliant with FDA 21 CFR Part 11, ISO 13485:2016, and ISO 14971.

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator

### Frontend
- **Framework**: Next.js 14 (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Architecture Patterns

### Backend Architecture

```
backend/
├── src/
│   ├── server.ts              # Express app entry point
│   ├── database/
│   │   ├── connection.ts      # PostgreSQL connection pool
│   │   └── schema.sql         # Database schema
│   ├── middleware/
│   │   ├── auth.ts            # Authentication & authorization
│   │   ├── auditLogger.ts     # Audit trail logging
│   │   └── errorHandler.ts    # Error handling
│   ├── routes/                # API route handlers
│   │   ├── auth.ts
│   │   ├── documents.ts
│   │   ├── capa.ts
│   │   └── ...
│   └── utils/
│       └── electronicSignature.ts  # 21 CFR Part 11 signatures
```

### Frontend Architecture

```
frontend/
├── app/                       # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   ├── login/                # Login page
│   └── dashboard/            # Dashboard and modules
├── lib/
│   └── api.ts                # API client configuration
└── components/               # Reusable components
```

## Database Design

### Core Tables

1. **users**: User accounts and authentication
2. **roles**: System roles (Quality Manager, Auditor, etc.)
3. **permissions**: Granular permissions
4. **user_roles**: Many-to-many user-role mapping
5. **role_permissions**: Many-to-many role-permission mapping

### Module Tables

- **documents**: Document control
- **document_approvals**: Approval workflow
- **capa**: CAPA records
- **change_control**: Change control records
- **training_records**: Training management
- **audits**: Audit management
- **risk_assessments**: Risk management (ISO 14971)
- **complaints**: Complaint handling
- **deviations**: Deviation handling

### Compliance Tables

- **electronic_signatures**: 21 CFR Part 11 signatures
- **audit_trail**: Immutable audit log

## Security Architecture

### Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Server validates credentials and checks account status
3. Server generates JWT token with user ID, email, and roles
4. Client stores token in localStorage
5. Client includes token in `Authorization: Bearer <token>` header for all requests
6. Server validates token on each request

### Authorization

- **Role-Based Access Control (RBAC)**: Users have roles, roles have permissions
- **Permission Checks**: Middleware checks user permissions before allowing actions
- **Resource-Level Authorization**: Additional checks for document ownership, etc.

### Electronic Signatures (21 CFR Part 11)

1. User initiates signature action (approve, review, etc.)
2. System creates signature record with:
   - User ID
   - Document type and ID
   - Action type
   - Timestamp
   - Cryptographic hash
   - IP address and user agent
3. Signature is linked to document/record
4. Signature cannot be modified (immutable)
5. Signatures can be revoked with proper authorization

### Audit Trail

- **Immutable**: Entries cannot be modified or deleted
- **Chained**: Each entry includes hash of previous entry
- **Complete**: All user actions logged
- **Tamper Detection**: Cryptographic hashes detect modifications

## API Design

### RESTful Principles

- GET: Retrieve resources
- POST: Create resources
- PUT: Update resources
- DELETE: Delete resources

### Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Format

```json
{
  "success": false,
  "error": {
    "message": "Error description"
  }
}
```

## Data Flow

### Document Approval Flow

1. User creates document (status: draft)
2. User submits for approval (status: under_review)
3. System creates approval records for each approver
4. Approvers review and sign electronically
5. When all approvals complete, document status changes to approved
6. All actions logged in audit trail

### CAPA Flow

1. CAPA initiated from source (audit, complaint, etc.)
2. Investigation phase (root cause analysis)
3. Action plan development
4. Implementation
5. Effectiveness check
6. Closure with verification

## Scalability Considerations

### Database

- Indexes on frequently queried columns
- Partitioning for large audit trail tables (future)
- Read replicas for reporting (future)

### Application

- Stateless API design (JWT tokens)
- Horizontal scaling capability
- Connection pooling for database

### Caching (Future)

- Redis for session management
- Cache frequently accessed data
- Cache user permissions

## Deployment Architecture

### Development

- Local PostgreSQL instance
- Node.js development server
- Next.js development server

### Production (Recommended)

- PostgreSQL on dedicated server or managed service
- Node.js API behind reverse proxy (nginx)
- Next.js static export or server-side rendering
- CDN for static assets
- Load balancer for high availability

## Monitoring and Logging

### Logging

- Winston for structured logging
- Log levels: error, warn, info, debug
- Audit trail for compliance

### Monitoring (Future)

- Application performance monitoring (APM)
- Database performance monitoring
- Error tracking (Sentry, etc.)
- Uptime monitoring

## Backup and Recovery

### Database Backups

- Daily automated backups
- Point-in-time recovery capability
- Backup retention: 7 years (compliance requirement)

### Disaster Recovery

- Regular backup testing
- Recovery procedures documented
- RTO: 4 hours
- RPO: 24 hours

## Compliance Features

### FDA 21 CFR Part 11

- Electronic signatures with cryptographic integrity
- Immutable audit trails
- User authentication and authorization
- System controls and validation

### ISO 13485:2016

- Document control with versioning
- CAPA management
- Change control
- Training management
- Audit management

### ISO 14971

- Risk assessment with severity/probability
- Risk mitigation tracking
- Risk review process

## Future Enhancements

- Mobile app (React Native)
- Advanced reporting and analytics
- Integration with external systems
- Workflow automation
- AI-powered risk assessment
- Document comparison tools
- Email notifications
- Calendar integration
