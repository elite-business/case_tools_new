# Database Schema Documentation
# Case Tools v2.0 - Complete Database Design

## Database Overview

The Case Tools database maintains compatibility with existing schemas while introducing new tables for enhanced functionality. The database uses PostgreSQL 14+ with multiple schemas for logical separation.

## Schema Organization

```
PostgreSQL Database: casetools
├── cdrs_archives     (CDR raw data - existing)
├── stat              (Statistics & alerts - existing)
├── tableref          (Reference tables - existing)
├── casemanagement    (User management - existing/modified)
├── cases             (NEW - Case management)
├── grafana           (NEW - Grafana integration)
├── config            (NEW - System configuration)
└── audit             (NEW - Audit trails)
```

## Existing Schemas (Preserved)

### 1. CDR Archives Schema (`cdrs_archives`)

#### Table: `cdrs_msc_YYMMDD` (Partitioned by Day)
```sql
CREATE TABLE cdrs_archives.cdrs_msc_240102 (
    id BIGSERIAL PRIMARY KEY,
    call_id VARCHAR(100) UNIQUE NOT NULL,
    subscriber_a VARCHAR(20) NOT NULL,
    subscriber_b VARCHAR(20) NOT NULL,
    call_start_time TIMESTAMP NOT NULL,
    call_end_time TIMESTAMP,
    duration INTEGER, -- seconds
    call_type VARCHAR(20), -- VOICE, SMS, DATA
    call_status VARCHAR(20), -- COMPLETED, DROPPED, FAILED
    msc_name VARCHAR(50),
    cell_id VARCHAR(50),
    imsi VARCHAR(20),
    imei VARCHAR(20),
    charge_amount DECIMAL(10,2),
    data_volume BIGINT, -- bytes for data calls
    roaming_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cdrs_call_time ON cdrs_archives.cdrs_msc_240102(call_start_time);
CREATE INDEX idx_cdrs_subscriber ON cdrs_archives.cdrs_msc_240102(subscriber_a, subscriber_b);
CREATE INDEX idx_cdrs_status ON cdrs_archives.cdrs_msc_240102(call_status);
```

### 2. Statistics Schema (`stat`)

#### Table: `stattraficmsc`
```sql
CREATE TABLE stat.stattraficmsc (
    id SERIAL PRIMARY KEY,
    date_stat DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    msc_name VARCHAR(50) NOT NULL,
    total_calls INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    dropped_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    total_duration BIGINT, -- seconds
    avg_duration DECIMAL(10,2),
    total_revenue DECIMAL(15,2),
    unique_subscribers INTEGER,
    data_volume_gb DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date_stat, hour, msc_name)
);

CREATE INDEX idx_stattrafic_date ON stat.stattraficmsc(date_stat, hour);
CREATE INDEX idx_stattrafic_msc ON stat.stattraficmsc(msc_name);
```

#### Table: `alerte_ra` (Revenue Assurance Alerts)
```sql
CREATE TABLE stat.alerte_ra (
    id SERIAL PRIMARY KEY,
    id_rule INTEGER,
    namerule VARCHAR(255),
    date_detection TIMESTAMP DEFAULT NOW(),
    dateappel DATE,
    etat VARCHAR(50), -- OPEN, ASSIGNED, CLOSED
    seuil DECIMAL(15,2),
    valeur DECIMAL(15,2),
    function VARCHAR(100),
    status VARCHAR(50),
    notified BOOLEAN DEFAULT FALSE,
    seuilmin DECIMAL(15,2),
    seuilmed DECIMAL(15,2),
    seilmax DECIMAL(15,2),
    severity VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW
    affected_records INTEGER,
    potential_loss DECIMAL(15,2),
    description TEXT
);

CREATE INDEX idx_alerte_date ON stat.alerte_ra(date_detection);
CREATE INDEX idx_alerte_status ON stat.alerte_ra(status, etat);
CREATE INDEX idx_alerte_rule ON stat.alerte_ra(id_rule);
```

#### Table: `historique_alerte`
```sql
CREATE TABLE stat.historique_alerte (
    id SERIAL PRIMARY KEY,
    id_rule INTEGER,
    date_statut TIMESTAMP DEFAULT NOW(),
    etat VARCHAR(50),
    nom_utilisateur VARCHAR(100),
    commentaire TEXT,
    action_taken VARCHAR(100)
);

CREATE INDEX idx_hist_alerte_rule ON stat.historique_alerte(id_rule);
CREATE INDEX idx_hist_alerte_date ON stat.historique_alerte(date_statut);
```

### 3. Reference Tables Schema (`tableref`)

#### Table: `rarules` (Revenue Assurance Rules)
```sql
CREATE TABLE tableref.rarules (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    id_domain INTEGER REFERENCES tableref.domaincontrol(id),
    id_revenue INTEGER REFERENCES tableref.revenuestream(id),
    nom_utilisateur VARCHAR(100),
    type VARCHAR(50), -- THRESHOLD, PATTERN, ANOMALY
    severity VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_rarules_active ON tableref.rarules(active);
CREATE INDEX idx_rarules_type ON tableref.rarules(type);
```

#### Table: `parametres_rarules`
```sql
CREATE TABLE tableref.parametres_rarules (
    id SERIAL PRIMARY KEY,
    id_rule INTEGER REFERENCES tableref.rarules(id) ON DELETE CASCADE,
    id_parametre INTEGER,
    fonction VARCHAR(100), -- SUM, AVG, COUNT, MIN, MAX
    seuil DECIMAL(15,2),
    nameparametre VARCHAR(255),
    operator VARCHAR(10), -- >, <, =, >=, <=, !=
    time_window_minutes INTEGER DEFAULT 5
);

CREATE INDEX idx_param_rule ON tableref.parametres_rarules(id_rule);
```

#### Table: `domaincontrol`
```sql
CREATE TABLE tableref.domaincontrol (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    domaine VARCHAR(255),
    description TEXT,
    parent_id INTEGER REFERENCES tableref.domaincontrol(id),
    active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_domain_parent ON tableref.domaincontrol(parent_id);
```

#### Table: `revenuestream`
```sql
CREATE TABLE tableref.revenuestream (
    id SERIAL PRIMARY KEY,
    revenuestream VARCHAR(255) UNIQUE NOT NULL,
    id_function INTEGER,
    description TEXT,
    category VARCHAR(50), -- VOICE, DATA, SMS, VAS
    active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_revenue_category ON tableref.revenuestream(category);
```

### 4. Case Management Schema (`casemanagement`)

#### Table: `userlogin` (Existing - Enhanced)
```sql
CREATE TABLE casemanagement.userlogin (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    login VARCHAR(100) UNIQUE NOT NULL,
    mail VARCHAR(255),
    password VARCHAR(255), -- SHA-256 hashed
    matricule VARCHAR(50),
    etat VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED
    created_date TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    -- Permissions
    domaine_control BOOLEAN DEFAULT FALSE,
    revunue_stream BOOLEAN DEFAULT FALSE,
    historique_alert BOOLEAN DEFAULT FALSE,
    admin_add BOOLEAN DEFAULT FALSE,
    ra_rule BOOLEAN DEFAULT FALSE,
    stat BOOLEAN DEFAULT FALSE,
    assigned_to BOOLEAN DEFAULT FALSE,
    re_assigned_to BOOLEAN DEFAULT FALSE,
    closed BOOLEAN DEFAULT FALSE,
    -- Authentication
    auth_token VARCHAR(500),
    token_expiration TIMESTAMP,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    -- Additional fields
    role VARCHAR(50), -- ADMIN, MANAGER, ANALYST, VIEWER
    department VARCHAR(100),
    phone VARCHAR(20),
    notification_preferences JSONB
);

CREATE INDEX idx_user_login ON casemanagement.userlogin(login);
CREATE INDEX idx_user_role ON casemanagement.userlogin(role);
CREATE INDEX idx_user_active ON casemanagement.userlogin(etat);
```

#### Table: `alert_notification`
```sql
CREATE TABLE casemanagement.alert_notification (
    id SERIAL PRIMARY KEY,
    id_rule INTEGER,
    id_alert INTEGER,
    user_id INTEGER REFERENCES casemanagement.userlogin(id),
    rule_name VARCHAR(255),
    description TEXT,
    dateappel DATE,
    type VARCHAR(50),
    date_detection TIMESTAMP DEFAULT NOW(),
    clicked BOOLEAN DEFAULT FALSE,
    mail_send BOOLEAN DEFAULT FALSE,
    status VARCHAR(50),
    threshhold DECIMAL(15,2),
    notification_channel VARCHAR(50), -- EMAIL, WEBHOOK, IN_APP
    sent_at TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notif_user ON casemanagement.alert_notification(user_id);
CREATE INDEX idx_notif_date ON casemanagement.alert_notification(date_detection);
CREATE INDEX idx_notif_status ON casemanagement.alert_notification(status);
```

## New Schemas

### 5. Cases Schema (`cases`)

#### Table: `case`
```sql
CREATE TABLE cases.case (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL, -- CASE-2025-0001
    alert_id INTEGER REFERENCES stat.alerte_ra(id),
    grafana_alert_id VARCHAR(255),
    grafana_alert_uid VARCHAR(100),
    
    -- Case Details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
    priority INTEGER CHECK (priority BETWEEN 1 AND 5),
    category VARCHAR(50), -- REVENUE_LOSS, NETWORK_ISSUE, FRAUD, QUALITY
    
    -- Status & Assignment
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, CANCELLED
    assigned_to INTEGER REFERENCES casemanagement.userlogin(id),
    assigned_by INTEGER REFERENCES casemanagement.userlogin(id),
    assigned_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    
    -- SLA
    sla_deadline TIMESTAMP,
    sla_breached BOOLEAN DEFAULT FALSE,
    response_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    
    -- Impact
    affected_services TEXT[],
    affected_customers INTEGER,
    estimated_loss DECIMAL(15,2),
    actual_loss DECIMAL(15,2),
    
    -- Resolution
    root_cause TEXT,
    resolution_actions TEXT,
    preventive_measures TEXT,
    closed_by INTEGER REFERENCES casemanagement.userlogin(id),
    closure_reason VARCHAR(100),
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB,
    parent_case_id INTEGER REFERENCES cases.case(id),
    related_cases INTEGER[]
);

-- Indexes
CREATE INDEX idx_case_number ON cases.case(case_number);
CREATE INDEX idx_case_status ON cases.case(status);
CREATE INDEX idx_case_assigned ON cases.case(assigned_to, status);
CREATE INDEX idx_case_created ON cases.case(created_at DESC);
CREATE INDEX idx_case_severity ON cases.case(severity, status);
CREATE INDEX idx_case_sla ON cases.case(sla_deadline) WHERE status NOT IN ('CLOSED', 'CANCELLED');
```

#### Table: `case_comment`
```sql
CREATE TABLE cases.case_comment (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases.case(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES casemanagement.userlogin(id),
    comment TEXT NOT NULL,
    comment_type VARCHAR(50), -- USER, SYSTEM, ACTION
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    is_internal BOOLEAN DEFAULT FALSE,
    attachments JSONB
);

CREATE INDEX idx_comment_case ON cases.case_comment(case_id);
CREATE INDEX idx_comment_created ON cases.case_comment(created_at);
```

#### Table: `case_activity`
```sql
CREATE TABLE cases.case_activity (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases.case(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES casemanagement.userlogin(id),
    activity_type VARCHAR(50) NOT NULL, -- CREATED, ASSIGNED, UPDATED, COMMENTED, RESOLVED, CLOSED
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_activity_case ON cases.case_activity(case_id);
CREATE INDEX idx_activity_created ON cases.case_activity(created_at);
CREATE INDEX idx_activity_user ON cases.case_activity(user_id);
```

### 6. Grafana Integration Schema (`grafana`)

#### Table: `webhook_logs`
```sql
CREATE TABLE grafana.webhook_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    webhook_type VARCHAR(50), -- ALERT_FIRING, ALERT_RESOLVED
    alert_name VARCHAR(255),
    alert_uid VARCHAR(100),
    grafana_url TEXT,
    payload JSONB NOT NULL,
    headers JSONB,
    response_status VARCHAR(50),
    response_body TEXT,
    processing_time_ms INTEGER,
    case_id INTEGER REFERENCES cases.case(id),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

CREATE INDEX idx_webhook_timestamp ON grafana.webhook_logs(timestamp DESC);
CREATE INDEX idx_webhook_alert ON grafana.webhook_logs(alert_uid);
CREATE INDEX idx_webhook_status ON grafana.webhook_logs(response_status);
```

#### Table: `alert_mappings`
```sql
CREATE TABLE grafana.alert_mappings (
    id SERIAL PRIMARY KEY,
    grafana_alert_uid VARCHAR(100) UNIQUE NOT NULL,
    grafana_alert_name VARCHAR(255),
    rule_id INTEGER REFERENCES tableref.rarules(id),
    sql_query TEXT,
    threshold_config JSONB,
    notification_config JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    last_evaluation TIMESTAMP,
    evaluation_count INTEGER DEFAULT 0
);

CREATE INDEX idx_alert_map_uid ON grafana.alert_mappings(grafana_alert_uid);
CREATE INDEX idx_alert_map_active ON grafana.alert_mappings(active);
```

#### Table: `dashboard_config`
```sql
CREATE TABLE grafana.dashboard_config (
    id SERIAL PRIMARY KEY,
    dashboard_uid VARCHAR(100) UNIQUE NOT NULL,
    dashboard_name VARCHAR(255),
    dashboard_url TEXT,
    category VARCHAR(50), -- REVENUE, NETWORK, QUALITY, EXECUTIVE
    config_json JSONB,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

### 7. Configuration Schema (`config`)

#### Table: `system_config`
```sql
CREATE TABLE config.system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50), -- STRING, NUMBER, BOOLEAN, JSON
    category VARCHAR(100),
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- Default configurations
INSERT INTO config.system_config (config_key, config_value, config_type, category) VALUES
('email.smtp.host', 'smtp.elite.com', 'STRING', 'EMAIL'),
('email.smtp.port', '587', 'NUMBER', 'EMAIL'),
('sla.critical.minutes', '15', 'NUMBER', 'SLA'),
('sla.high.minutes', '60', 'NUMBER', 'SLA'),
('sla.medium.minutes', '240', 'NUMBER', 'SLA'),
('notification.rate.limit.per.minute', '10', 'NUMBER', 'NOTIFICATION');
```

#### Table: `notification_templates`
```sql
CREATE TABLE config.notification_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) UNIQUE NOT NULL,
    template_type VARCHAR(50), -- EMAIL, SMS, SLACK
    subject VARCHAR(500),
    body_template TEXT,
    variables JSONB, -- List of available variables
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

### 8. Audit Schema (`audit`)

#### Table: `audit_log`
```sql
CREATE TABLE audit.audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id INTEGER REFERENCES casemanagement.userlogin(id),
    username VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- CASE, USER, RULE, CONFIG
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    duration_ms INTEGER
);

-- Partitioning by month for performance
CREATE INDEX idx_audit_timestamp ON audit.audit_log(timestamp DESC);
CREATE INDEX idx_audit_user ON audit.audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit.audit_log(action);
```

## Database Views

### View: Active Alerts Summary
```sql
CREATE OR REPLACE VIEW stat.v_active_alerts AS
SELECT 
    a.id,
    a.namerule,
    a.date_detection,
    a.severity,
    a.valeur,
    a.seuil,
    a.status,
    r.type as rule_type,
    d.domain,
    rs.revenuestream,
    CASE 
        WHEN c.id IS NOT NULL THEN 'CASE_CREATED'
        ELSE 'NO_CASE'
    END as case_status,
    c.case_number,
    u.name as assigned_to
FROM stat.alerte_ra a
LEFT JOIN tableref.rarules r ON a.id_rule = r.id
LEFT JOIN tableref.domaincontrol d ON r.id_domain = d.id
LEFT JOIN tableref.revenuestream rs ON r.id_revenue = rs.id
LEFT JOIN cases.case c ON a.id = c.alert_id
LEFT JOIN casemanagement.userlogin u ON c.assigned_to = u.id
WHERE a.status = 'OPEN'
ORDER BY a.date_detection DESC;
```

### View: Case Performance Metrics
```sql
CREATE OR REPLACE VIEW cases.v_case_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_cases,
    COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_cases,
    COUNT(*) FILTER (WHERE sla_breached = true) as sla_breached_cases,
    AVG(resolution_time_minutes) as avg_resolution_time,
    SUM(actual_loss) as total_loss,
    COUNT(DISTINCT assigned_to) as active_agents
FROM cases.case
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

## Database Functions & Triggers

### Function: Auto-assign Case
```sql
CREATE OR REPLACE FUNCTION cases.auto_assign_case()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Find least loaded user with appropriate permissions
    SELECT u.id INTO v_user_id
    FROM casemanagement.userlogin u
    LEFT JOIN (
        SELECT assigned_to, COUNT(*) as case_count
        FROM cases.case
        WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')
        GROUP BY assigned_to
    ) cc ON u.id = cc.assigned_to
    WHERE u.etat = 'ACTIVE'
      AND u.assigned_to = true
      AND u.role IN ('ANALYST', 'SENIOR_ANALYST')
    ORDER BY COALESCE(cc.case_count, 0) ASC
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        NEW.assigned_to = v_user_id;
        NEW.assigned_at = NOW();
        NEW.status = 'ASSIGNED';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_assign_case
BEFORE INSERT ON cases.case
FOR EACH ROW
WHEN (NEW.assigned_to IS NULL)
EXECUTE FUNCTION cases.auto_assign_case();
```

### Function: Calculate SLA
```sql
CREATE OR REPLACE FUNCTION cases.calculate_sla()
RETURNS TRIGGER AS $$
DECLARE
    v_sla_minutes INTEGER;
BEGIN
    -- Get SLA based on severity
    SELECT 
        CASE NEW.severity
            WHEN 'CRITICAL' THEN config_value::INTEGER
            WHEN 'HIGH' THEN config_value::INTEGER
            WHEN 'MEDIUM' THEN config_value::INTEGER
            ELSE 480 -- Default 8 hours
        END INTO v_sla_minutes
    FROM config.system_config
    WHERE config_key = 'sla.' || LOWER(NEW.severity) || '.minutes';
    
    NEW.sla_deadline = NEW.created_at + (v_sla_minutes || ' minutes')::INTERVAL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_sla
BEFORE INSERT ON cases.case
FOR EACH ROW
EXECUTE FUNCTION cases.calculate_sla();
```

## Performance Optimization

### Indexes Strategy
```sql
-- Critical performance indexes
CREATE INDEX CONCURRENTLY idx_alerte_detection_status 
ON stat.alerte_ra(date_detection DESC) 
WHERE status = 'OPEN';

CREATE INDEX CONCURRENTLY idx_case_assignment_workload
ON cases.case(assigned_to, status)
WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS');

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_case_open_critical
ON cases.case(severity, created_at DESC)
WHERE status = 'OPEN' AND severity = 'CRITICAL';
```

### Partitioning Strategy
```sql
-- Partition audit logs by month
CREATE TABLE audit.audit_log_2025_01 PARTITION OF audit.audit_log
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Partition CDRs by day
CREATE TABLE cdrs_archives.cdrs_msc_250101 PARTITION OF cdrs_archives.cdrs_msc
FOR VALUES FROM ('2025-01-01') TO ('2025-01-02');
```

### Materialized Views for Dashboards
```sql
CREATE MATERIALIZED VIEW stats.mv_daily_metrics AS
SELECT 
    date_stat,
    SUM(total_calls) as total_calls,
    SUM(dropped_calls) as dropped_calls,
    SUM(total_revenue) as total_revenue,
    AVG(avg_duration) as avg_duration
FROM stat.stattraficmsc
WHERE date_stat >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_stat
WITH DATA;

-- Refresh every hour
CREATE OR REPLACE FUNCTION stats.refresh_daily_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY stats.mv_daily_metrics;
END;
$$ LANGUAGE plpgsql;
```

## Migration Scripts

### Initial Schema Creation
```sql
-- Run in order:
-- 1. Create schemas
CREATE SCHEMA IF NOT EXISTS cases;
CREATE SCHEMA IF NOT EXISTS grafana;
CREATE SCHEMA IF NOT EXISTS config;
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. Grant permissions
GRANT ALL ON SCHEMA cases TO casetools_app;
GRANT ALL ON SCHEMA grafana TO casetools_app;
GRANT ALL ON SCHEMA config TO casetools_app;
GRANT ALL ON SCHEMA audit TO casetools_app;

-- 3. Create tables (run DDL above)
-- 4. Create indexes
-- 5. Create views
-- 6. Create functions and triggers
```

---
*Schema Version: 2.0*  
*Database: PostgreSQL 14+*  
*Last Updated: January 2025*