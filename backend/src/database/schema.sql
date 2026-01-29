-- Remidio eQMS Database Schema
-- Compliant with ISO 13485, FDA 21 CFR Part 11, ISO 14971

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER MANAGEMENT & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    job_title VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- ELECTRONIC SIGNATURES (21 CFR Part 11)
-- ============================================

CREATE TABLE electronic_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    document_type VARCHAR(50) NOT NULL, -- 'document', 'capa', 'change_control', etc.
    document_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'approve', 'review', 'reject', 'execute'
    signature_type VARCHAR(20) NOT NULL, -- 'approval', 'review', 'execution'
    signature_hash VARCHAR(255) NOT NULL, -- Cryptographic hash of signature
    ip_address VARCHAR(45),
    user_agent TEXT,
    signed_at TIMESTAMP DEFAULT NOW(),
    reason TEXT, -- Required for some actions per 21 CFR Part 11
    is_valid BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(id),
    revocation_reason TEXT
);

CREATE INDEX idx_signatures_document ON electronic_signatures(document_type, document_id);
CREATE INDEX idx_signatures_user ON electronic_signatures(user_id);

-- ============================================
-- AUDIT TRAIL (Immutable, Tamper-Proof)
-- ============================================

CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'sign', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'document', 'user', 'capa', etc.
    resource_id UUID NOT NULL,
    old_values JSONB, -- Previous state (for updates)
    new_values JSONB, -- New state
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    hash VARCHAR(255) NOT NULL, -- Cryptographic hash for tamper detection
    previous_hash VARCHAR(255) -- Chain hash for immutability
);

CREATE INDEX idx_audit_user ON audit_trail(user_id);
CREATE INDEX idx_audit_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_trail(timestamp);

-- ============================================
-- DOCUMENT CONTROL
-- ============================================

CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES document_categories(id),
    document_type VARCHAR(50) NOT NULL, -- 'SOP', 'Policy', 'Form', 'Specification', etc.
    version VARCHAR(20) NOT NULL,
    revision_number INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- 'draft', 'under_review', 'approved', 'obsolete', 'superseded'
    file_path VARCHAR(500),
    file_hash VARCHAR(255), -- For integrity verification
    file_size BIGINT,
    mime_type VARCHAR(100),
    effective_date DATE,
    review_date DATE,
    next_review_date DATE,
    description TEXT,
    keywords TEXT[],
    controlled_copy BOOLEAN DEFAULT true,
    distribution_list UUID[], -- Array of user IDs
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    UNIQUE(document_number, version)
);

CREATE TABLE document_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    revision_number INTEGER NOT NULL,
    change_summary TEXT NOT NULL,
    file_path VARCHAR(500),
    file_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(document_id, version, revision_number)
);

CREATE TABLE document_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approval_order INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'pending', 'approved', 'rejected'
    comments TEXT,
    approved_at TIMESTAMP,
    signature_id UUID REFERENCES electronic_signatures(id),
    UNIQUE(document_id, approver_id, approval_order)
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_number ON documents(document_number);

-- ============================================
-- CAPA MANAGEMENT
-- ============================================

CREATE TABLE capa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capa_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'corrective', 'preventive'
    source VARCHAR(50) NOT NULL, -- 'audit', 'complaint', 'deviation', 'internal_review'
    source_reference_id UUID, -- Reference to source document
    priority VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(50) NOT NULL, -- 'initiated', 'investigation', 'action_plan', 'implementation', 'effectiveness_check', 'closed'
    description TEXT NOT NULL,
    root_cause_analysis TEXT,
    action_plan TEXT,
    effectiveness_criteria TEXT,
    target_completion_date DATE,
    actual_completion_date DATE,
    effectiveness_check_date DATE,
    effectiveness_result TEXT,
    is_effective BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    owner_id UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id)
);

CREATE TABLE capa_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capa_id UUID NOT NULL REFERENCES capa(id) ON DELETE CASCADE,
    action_description TEXT NOT NULL,
    responsible_person_id UUID REFERENCES users(id),
    due_date DATE,
    completed_date DATE,
    status VARCHAR(20) NOT NULL, -- 'pending', 'in_progress', 'completed', 'overdue'
    evidence_file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE capa_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capa_id UUID NOT NULL REFERENCES capa(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approval_type VARCHAR(20) NOT NULL, -- 'initiation', 'action_plan', 'closure'
    status VARCHAR(20) NOT NULL, -- 'pending', 'approved', 'rejected'
    comments TEXT,
    approved_at TIMESTAMP,
    signature_id UUID REFERENCES electronic_signatures(id)
);

CREATE INDEX idx_capa_status ON capa(status);
CREATE INDEX idx_capa_number ON capa(capa_number);
CREATE INDEX idx_capa_owner ON capa(owner_id);

-- ============================================
-- CHANGE CONTROL
-- ============================================

CREATE TABLE change_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- 'design', 'process', 'documentation', 'software'
    priority VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(50) NOT NULL, -- 'initiated', 'review', 'approval', 'implementation', 'verification', 'closed'
    description TEXT NOT NULL,
    reason_for_change TEXT NOT NULL,
    proposed_change TEXT NOT NULL,
    impact_analysis TEXT,
    risk_assessment_id UUID, -- Reference to risk management record
    implementation_plan TEXT,
    verification_plan TEXT,
    target_completion_date DATE,
    actual_completion_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    owner_id UUID REFERENCES users(id),
    change_board_approver_id UUID REFERENCES users(id)
);

CREATE TABLE change_control_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_control_id UUID NOT NULL REFERENCES change_control(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'document', 'component', 'process', 'software'
    item_id UUID NOT NULL,
    item_description TEXT,
    action VARCHAR(50) NOT NULL, -- 'modify', 'add', 'remove', 'replace'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE change_control_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_control_id UUID NOT NULL REFERENCES change_control(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approval_order INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'pending', 'approved', 'rejected'
    comments TEXT,
    approved_at TIMESTAMP,
    signature_id UUID REFERENCES electronic_signatures(id),
    UNIQUE(change_control_id, approver_id, approval_order)
);

CREATE INDEX idx_change_control_status ON change_control(status);
CREATE INDEX idx_change_control_number ON change_control(change_number);

-- ============================================
-- TRAINING MANAGEMENT
-- ============================================

CREATE TABLE training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'mandatory', 'optional', 'role_based'
    duration_hours DECIMAL(5,2),
    validity_months INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    program_id UUID NOT NULL REFERENCES training_programs(id),
    training_date DATE NOT NULL,
    completion_date DATE,
    expiry_date DATE,
    status VARCHAR(20) NOT NULL, -- 'scheduled', 'in_progress', 'completed', 'expired', 'failed'
    training_method VARCHAR(50), -- 'classroom', 'online', 'on_job', 'external'
    trainer_id UUID REFERENCES users(id),
    score DECIMAL(5,2),
    passing_score DECIMAL(5,2) DEFAULT 70.00,
    certificate_file_path VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE training_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id),
    program_id UUID NOT NULL REFERENCES training_programs(id),
    is_mandatory BOOLEAN DEFAULT true,
    frequency_months INTEGER, -- Recurring training requirement
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_user ON training_records(user_id);
CREATE INDEX idx_training_program ON training_records(program_id);
CREATE INDEX idx_training_status ON training_records(status);
CREATE INDEX idx_training_expiry ON training_records(expiry_date);

-- ============================================
-- AUDIT MANAGEMENT
-- ============================================

CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_number VARCHAR(50) UNIQUE NOT NULL,
    audit_type VARCHAR(50) NOT NULL, -- 'internal', 'external', 'supplier', 'regulatory'
    scope TEXT NOT NULL,
    standard VARCHAR(100), -- 'ISO 13485', 'FDA', 'CE Mark', etc.
    scheduled_start_date DATE NOT NULL,
    scheduled_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(50) NOT NULL, -- 'planned', 'in_progress', 'completed', 'cancelled'
    lead_auditor_id UUID REFERENCES users(id),
    auditee VARCHAR(255), -- Department or external organization
    location VARCHAR(255),
    objectives TEXT,
    findings_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE audit_team (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    auditor_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL, -- 'lead', 'auditor', 'observer'
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(audit_id, auditor_id)
);

CREATE TABLE audit_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    finding_number VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'non_conformity', 'observation', 'opportunity'
    severity VARCHAR(20), -- 'major', 'minor', 'critical' (for non-conformities)
    clause_reference VARCHAR(100), -- ISO clause or regulation reference
    description TEXT NOT NULL,
    evidence TEXT,
    root_cause TEXT,
    corrective_action_id UUID REFERENCES capa(id),
    status VARCHAR(50) NOT NULL, -- 'open', 'in_progress', 'closed', 'verified'
    target_completion_date DATE,
    actual_completion_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(audit_id, finding_number)
);

CREATE TABLE audit_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    report_file_path VARCHAR(500),
    report_hash VARCHAR(255),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    signature_id UUID REFERENCES electronic_signatures(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_type ON audits(audit_type);
CREATE INDEX idx_audits_dates ON audits(scheduled_start_date, scheduled_end_date);

-- ============================================
-- RISK MANAGEMENT (ISO 14971)
-- ============================================

CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    product_component VARCHAR(255),
    hazard VARCHAR(255) NOT NULL,
    hazard_situation TEXT NOT NULL,
    harm VARCHAR(255) NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5), -- 1=Negligible, 5=Catastrophic
    probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5), -- 1=Remote, 5=Frequent
    risk_score INTEGER GENERATED ALWAYS AS (severity * probability) STORED,
    risk_level VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN severity * probability >= 20 THEN 'unacceptable'
            WHEN severity * probability >= 12 THEN 'high'
            WHEN severity * probability >= 6 THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    current_controls TEXT,
    residual_risk_score INTEGER,
    residual_risk_level VARCHAR(20),
    mitigation_measures TEXT,
    mitigation_effectiveness TEXT,
    status VARCHAR(50) NOT NULL, -- 'new', 'under_review', 'mitigated', 'accepted', 'closed'
    review_date DATE,
    next_review_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id)
);

CREATE TABLE risk_mitigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    mitigation_type VARCHAR(50) NOT NULL, -- 'elimination', 'reduction', 'protection', 'warning'
    description TEXT NOT NULL,
    responsible_person_id UUID REFERENCES users(id),
    target_completion_date DATE,
    actual_completion_date DATE,
    status VARCHAR(20) NOT NULL, -- 'planned', 'in_progress', 'completed', 'verified'
    verification_evidence TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE risk_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    review_date DATE NOT NULL,
    reviewed_by UUID NOT NULL REFERENCES users(id),
    review_comments TEXT,
    severity_updated INTEGER CHECK (severity_updated >= 1 AND severity_updated <= 5),
    probability_updated INTEGER CHECK (probability_updated >= 1 AND probability_updated <= 5),
    status_updated VARCHAR(50),
    signature_id UUID REFERENCES electronic_signatures(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risk_status ON risk_assessments(status);
CREATE INDEX idx_risk_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_score ON risk_assessments(risk_score);
CREATE INDEX idx_risk_review_date ON risk_assessments(next_review_date);

-- ============================================
-- COMPLAINT & DEVIATION HANDLING
-- ============================================

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    received_date DATE NOT NULL,
    reported_by VARCHAR(255), -- External customer or internal
    contact_info VARCHAR(255),
    product_name VARCHAR(255),
    product_lot_batch VARCHAR(100),
    product_serial_number VARCHAR(100),
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    category VARCHAR(50), -- 'safety', 'performance', 'quality', 'labeling'
    status VARCHAR(50) NOT NULL, -- 'received', 'investigating', 'resolved', 'closed'
    investigation_summary TEXT,
    root_cause TEXT,
    corrective_action_id UUID REFERENCES capa(id),
    resolution TEXT,
    customer_response TEXT,
    closed_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    owner_id UUID REFERENCES users(id)
);

CREATE TABLE deviations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deviation_number VARCHAR(50) UNIQUE NOT NULL,
    deviation_type VARCHAR(50) NOT NULL, -- 'material', 'process', 'specification', 'documentation'
    detected_date DATE NOT NULL,
    detected_by UUID REFERENCES users(id),
    location VARCHAR(255),
    product_lot_batch VARCHAR(100),
    description TEXT NOT NULL,
    specification_reference TEXT,
    deviation_from TEXT NOT NULL,
    impact_assessment TEXT,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(50) NOT NULL, -- 'initiated', 'under_review', 'approved', 'rejected', 'closed'
    disposition VARCHAR(50), -- 'use_as_is', 'rework', 'scrap', 'return_to_supplier'
    justification TEXT,
    approval_required BOOLEAN DEFAULT true,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    signature_id UUID REFERENCES electronic_signatures(id),
    corrective_action_id UUID REFERENCES capa(id),
    closed_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    owner_id UUID REFERENCES users(id)
);

CREATE TABLE non_conformances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nc_number VARCHAR(50) UNIQUE NOT NULL,
    detected_date DATE NOT NULL,
    detected_by UUID REFERENCES users(id),
    source VARCHAR(50) NOT NULL, -- 'internal_audit', 'external_audit', 'inspection', 'process'
    description TEXT NOT NULL,
    standard_clause VARCHAR(100), -- ISO clause or regulation reference
    severity VARCHAR(20) NOT NULL, -- 'major', 'minor', 'critical'
    status VARCHAR(50) NOT NULL, -- 'open', 'investigating', 'corrective_action', 'closed', 'verified'
    root_cause TEXT,
    immediate_action TEXT,
    corrective_action_id UUID REFERENCES capa(id),
    verification_evidence TEXT,
    closed_date DATE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    owner_id UUID REFERENCES users(id)
);

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_number ON complaints(complaint_number);
CREATE INDEX idx_deviations_status ON deviations(status);
CREATE INDEX idx_deviations_number ON deviations(deviation_number);
CREATE INDEX idx_nc_status ON non_conformances(status);
CREATE INDEX idx_nc_number ON non_conformances(nc_number);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'approval_request', 'task_assigned', 'deadline', 'status_change'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capa_updated_at BEFORE UPDATE ON capa
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_control_updated_at BEFORE UPDATE ON change_control
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_records_updated_at BEFORE UPDATE ON training_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON audits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deviations_updated_at BEFORE UPDATE ON deviations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_non_conformances_updated_at BEFORE UPDATE ON non_conformances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA (Roles and Permissions)
-- ============================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('Quality Manager', 'Full access to all QMS modules'),
    ('Document Control', 'Manages document lifecycle'),
    ('CAPA Owner', 'Manages CAPA processes'),
    ('Change Control Board', 'Reviews and approves changes'),
    ('Auditor', 'Conducts audits'),
    ('Risk Manager', 'Manages risk assessments'),
    ('Training Coordinator', 'Manages training programs'),
    ('Employee', 'Basic user access'),
    ('Admin', 'System administrator');

-- Insert common permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    -- Document Control
    ('documents.create', 'documents', 'create', 'Create new documents'),
    ('documents.read', 'documents', 'read', 'View documents'),
    ('documents.update', 'documents', 'update', 'Edit documents'),
    ('documents.delete', 'documents', 'delete', 'Delete documents'),
    ('documents.approve', 'documents', 'approve', 'Approve documents'),
    -- CAPA
    ('capa.create', 'capa', 'create', 'Create CAPA records'),
    ('capa.read', 'capa', 'read', 'View CAPA records'),
    ('capa.update', 'capa', 'update', 'Edit CAPA records'),
    ('capa.approve', 'capa', 'approve', 'Approve CAPA actions'),
    -- Change Control
    ('change.create', 'change_control', 'create', 'Create change requests'),
    ('change.read', 'change_control', 'read', 'View change requests'),
    ('change.update', 'change_control', 'update', 'Edit change requests'),
    ('change.approve', 'change_control', 'approve', 'Approve changes'),
    -- Training
    ('training.create', 'training', 'create', 'Create training programs'),
    ('training.read', 'training', 'read', 'View training records'),
    ('training.update', 'training', 'update', 'Update training records'),
    -- Audit
    ('audit.create', 'audit', 'create', 'Create audit plans'),
    ('audit.read', 'audit', 'read', 'View audit records'),
    ('audit.update', 'audit', 'update', 'Edit audit records'),
    -- Risk
    ('risk.create', 'risk', 'create', 'Create risk assessments'),
    ('risk.read', 'risk', 'read', 'View risk assessments'),
    ('risk.update', 'risk', 'update', 'Edit risk assessments'),
    ('risk.approve', 'risk', 'approve', 'Approve risk assessments'),
    -- Complaints
    ('complaint.create', 'complaint', 'create', 'Create complaint records'),
    ('complaint.read', 'complaint', 'read', 'View complaints'),
    ('complaint.update', 'complaint', 'update', 'Edit complaints'),
    -- Users
    ('users.create', 'users', 'create', 'Create users'),
    ('users.read', 'users', 'read', 'View users'),
    ('users.update', 'users', 'update', 'Edit users'),
    ('users.delete', 'users', 'delete', 'Delete users');

-- Grant permissions to Quality Manager role (example)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Quality Manager';
