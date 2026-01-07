-- liquibase formatted sql

-- changeset elite:1 labels:tables
-- comment: Create new tables for Case Tools v2.0

-- Create team table
CREATE TABLE IF NOT EXISTS casemanagement.team (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    leader_id BIGINT REFERENCES casemanagement.userlogin(id),
    department VARCHAR(100),
    location VARCHAR(100),
    contact_email VARCHAR(100),
    phone VARCHAR(20),
    active BOOLEAN DEFAULT true,
    specialization VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team_member table
CREATE TABLE IF NOT EXISTS casemanagement.team_member (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES casemanagement.team(id),
    user_id BIGINT NOT NULL REFERENCES casemanagement.userlogin(id),
    role VARCHAR(50),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    specialization VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Create system_setting table
CREATE TABLE IF NOT EXISTS casemanagement.system_setting (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    default_value TEXT,
    category VARCHAR(50),
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'STRING',
    required BOOLEAN DEFAULT false,
    encrypted BOOLEAN DEFAULT false,
    validation_rules TEXT,
    updated_by_id BIGINT REFERENCES casemanagement.userlogin(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_log table
CREATE TABLE IF NOT EXISTS casemanagement.system_log (
    id BIGSERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    component VARCHAR(100),
    message TEXT NOT NULL,
    exception TEXT,
    trace_id VARCHAR(50),
    user_id VARCHAR(50),
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create report table
CREATE TABLE IF NOT EXISTS casemanagement.report (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS',
    description TEXT,
    created_by_id BIGINT NOT NULL REFERENCES casemanagement.userlogin(id),
    completed_at TIMESTAMP,
    format VARCHAR(10) DEFAULT 'PDF',
    file_name VARCHAR(200),
    file_size BIGINT,
    file_path VARCHAR(500),
    parameters TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_leader ON casemanagement.team(leader_id);
CREATE INDEX IF NOT EXISTS idx_team_member_team ON casemanagement.team_member(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_user ON casemanagement.team_member(user_id);
CREATE INDEX IF NOT EXISTS idx_system_setting_category ON casemanagement.system_setting(category);
CREATE INDEX IF NOT EXISTS idx_system_log_level ON casemanagement.system_log(level);
CREATE INDEX IF NOT EXISTS idx_system_log_timestamp ON casemanagement.system_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_report_type ON casemanagement.report(type);
CREATE INDEX IF NOT EXISTS idx_report_status ON casemanagement.report(status);
CREATE INDEX IF NOT EXISTS idx_report_created_by ON casemanagement.report(created_by_id);

-- rollback DROP TABLE IF EXISTS casemanagement.report;
-- rollback DROP TABLE IF EXISTS casemanagement.system_log;
-- rollback DROP TABLE IF EXISTS casemanagement.system_setting;
-- rollback DROP TABLE IF EXISTS casemanagement.team_member;
-- rollback DROP TABLE IF EXISTS casemanagement.team;