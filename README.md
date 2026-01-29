# Remidio eQMS - Electronic Quality Management System

A comprehensive, FDA 21 CFR Part 11 compliant Electronic Quality Management System for Remidio, designed to meet ISO 13485:2016, ISO 14971, and IEC 62304 requirements.

## Compliance Standards

- ✅ ISO 13485:2016 (Quality Management Systems for Medical Devices)
- ✅ ISO 14971 (Risk Management for Medical Devices)
- ✅ FDA 21 CFR Part 11 (Electronic Records & Signatures)
- ✅ IEC 62304 (Medical Device Software Lifecycle)
- ✅ GDPR / HIPAA (Data Privacy)

## Core Modules

1. **Document Control** - Version control, approval workflows, document lifecycle
2. **CAPA Management** - Corrective and Preventive Actions tracking
3. **Change Control** - Engineering Change Orders (ECOs) and change management
4. **Training Management** - Employee training records and certifications
5. **Audit Management** - Internal and external audit scheduling and tracking
6. **Risk Management** - ISO 14971 compliant risk analysis and mitigation
7. **Complaint & Deviation Handling** - Non-conformance and complaint management
8. **User & Role Management** - Role-based access control (RBAC)
9. **Electronic Signatures** - 21 CFR Part 11 compliant digital signatures
10. **Audit Trail** - Immutable, tamper-proof activity logging

## Technology Stack

- **Frontend**: Next.js 14 (React), TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT with role-based access control
- **File Storage**: Secure document storage with versioning
- **Audit Trail**: Immutable blockchain-like logging

## Project Structure

```
eqms/
├── frontend/          # Next.js frontend application
├── backend/           # Express API server
├── database/          # PostgreSQL schema and migrations
├── docs/              # Compliance and technical documentation
└── docker/            # Docker configurations
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## Security & Compliance

- All data encrypted at rest and in transit
- Immutable audit trails for all actions
- Electronic signatures with cryptographic validation
- Role-based access control with least privilege principle
- Regular security audits and penetration testing

## License

Proprietary - Remidio Internal Use Only
