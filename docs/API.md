# eQMS API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require authentication via Bearer token.

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Endpoints

### Authentication

#### POST /auth/login
Login and receive JWT token.

**Request:**
```json
{
  "email": "user@remidio.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@remidio.com",
      "roles": ["Quality Manager"]
    }
  }
}
```

#### GET /auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@remidio.com",
    "first_name": "John",
    "last_name": "Doe",
    "roles": ["Quality Manager"]
  }
}
```

### Documents

#### GET /documents
Get all documents (with optional filters).

**Query Parameters:**
- `status`: Filter by status (draft, under_review, approved, obsolete)
- `category_id`: Filter by category
- `search`: Search in title, document_number, description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "document_number": "DOC-001",
      "title": "Quality Manual",
      "version": "1.0",
      "status": "approved",
      ...
    }
  ]
}
```

#### POST /documents
Create a new document.

**Request:**
```json
{
  "document_number": "DOC-001",
  "title": "Quality Manual",
  "document_type": "SOP",
  "version": "1.0",
  "description": "Main quality manual",
  "category_id": "uuid"
}
```

#### POST /documents/:id/submit
Submit document for approval.

**Request:**
```json
{
  "approver_ids": ["uuid1", "uuid2"]
}
```

#### POST /documents/:id/approve
Approve a document.

**Request:**
```json
{
  "comments": "Approved for release"
}
```

### CAPA

#### GET /capa
Get all CAPA records.

**Query Parameters:**
- `status`: Filter by status
- `type`: Filter by type (corrective, preventive)
- `priority`: Filter by priority

#### POST /capa
Create a new CAPA.

**Request:**
```json
{
  "title": "CAPA Title",
  "type": "corrective",
  "source": "audit",
  "priority": "high",
  "description": "Description of the issue",
  "owner_id": "uuid"
}
```

### Change Control

#### GET /change-control
Get all change controls.

#### POST /change-control
Create a new change control.

**Request:**
```json
{
  "title": "Change Title",
  "change_type": "design",
  "priority": "high",
  "description": "Description",
  "reason_for_change": "Reason",
  "proposed_change": "Proposed change details"
}
```

### Training

#### GET /training/programs
Get all training programs.

#### GET /training/records
Get training records.

**Query Parameters:**
- `user_id`: Filter by user
- `program_id`: Filter by program
- `status`: Filter by status

#### POST /training/records
Create training record.

**Request:**
```json
{
  "user_id": "uuid",
  "program_id": "uuid",
  "training_date": "2024-01-15",
  "training_method": "classroom"
}
```

### Audit

#### GET /audit
Get all audits.

#### POST /audit
Create audit plan.

**Request:**
```json
{
  "audit_type": "internal",
  "scope": "Quality Management System",
  "scheduled_start_date": "2024-02-01",
  "scheduled_end_date": "2024-02-05",
  "standard": "ISO 13485:2016"
}
```

### Risk Management

#### GET /risk
Get all risk assessments.

#### POST /risk
Create risk assessment.

**Request:**
```json
{
  "title": "Risk Title",
  "hazard": "Electrical shock",
  "hazard_situation": "User touches exposed wire",
  "harm": "Injury or death",
  "severity": 5,
  "probability": 2
}
```

### Complaints

#### GET /complaint
Get all complaints.

#### POST /complaint
Create complaint.

**Request:**
```json
{
  "received_date": "2024-01-15",
  "description": "Product defect description",
  "severity": "high",
  "product_name": "Product X"
}
```

### Users

#### GET /users
Get all users (requires permission).

#### GET /users/:id
Get user by ID.

#### POST /users/:id/roles
Assign role to user.

**Request:**
```json
{
  "role_id": "uuid"
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error message"
  }
}
```

**Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate-limited to 100 requests per 15 minutes per IP address.
