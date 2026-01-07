-- Migration for Grafana Case Management System
-- Creates tables for GrafanaAlert, CaseHistory, Notification entities
-- and adds missing fields to existing tables

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS casemanagement;

-- Create GrafanaAlert table
CREATE TABLE IF NOT EXISTS casemanagement.grafana_alert (
    id BIGSERIAL PRIMARY KEY,
    fingerprint VARCHAR(64) UNIQUE NOT NULL,
    alert_name VARCHAR(255) NOT NULL,
    alert_id VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    severity VARCHAR(20),
    message TEXT,
    description TEXT,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    generator_url TEXT,
    labels JSONB,
    annotations JSONB,
    values JSONB,
    case_id BIGINT,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,
    retry_count INTEGER DEFAULT 0,
    webhook_received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    raw_payload JSONB,
    source_receiver VARCHAR(100),
    external_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for GrafanaAlert
CREATE INDEX IF NOT EXISTS idx_grafana_alert_fingerprint ON casemanagement.grafana_alert(fingerprint);
CREATE INDEX IF NOT EXISTS idx_grafana_alert_status ON casemanagement.grafana_alert(status);
CREATE INDEX IF NOT EXISTS idx_grafana_alert_starts_at ON casemanagement.grafana_alert(starts_at);
CREATE INDEX IF NOT EXISTS idx_grafana_alert_case_id ON casemanagement.grafana_alert(case_id);
CREATE INDEX IF NOT EXISTS idx_grafana_alert_processed ON casemanagement.grafana_alert(processed);
CREATE INDEX IF NOT EXISTS idx_grafana_alert_webhook_received_at ON casemanagement.grafana_alert(webhook_received_at);

-- Create CaseHistory table
CREATE TABLE IF NOT EXISTS casemanagement.case_history (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT NOT NULL,
    changed_by BIGINT,
    changed_at TIMESTAMP NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    old_assignee_id BIGINT,
    new_assignee_id BIGINT,
    old_team_id BIGINT,
    new_team_id BIGINT,
    old_priority INTEGER,
    new_priority INTEGER,
    old_severity VARCHAR(20),
    new_severity VARCHAR(20),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    change_description TEXT,
    additional_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(128),
    workflow_step VARCHAR(100),
    automation_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for CaseHistory
CREATE INDEX IF NOT EXISTS idx_case_history_case_id ON casemanagement.case_history(case_id);
CREATE INDEX IF NOT EXISTS idx_case_history_changed_at ON casemanagement.case_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_case_history_changed_by ON casemanagement.case_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_case_history_status ON casemanagement.case_history(new_status);
CREATE INDEX IF NOT EXISTS idx_case_history_change_type ON casemanagement.case_history(change_type);
CREATE INDEX IF NOT EXISTS idx_case_history_automation ON casemanagement.case_history(automation_triggered);

-- Create Notification table
CREATE TABLE IF NOT EXISTS casemanagement.notification (
    id BIGSERIAL PRIMARY KEY,
    case_id BIGINT,
    recipient_user_id BIGINT,
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(30) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    subject VARCHAR(500),
    message TEXT NOT NULL,
    template_id VARCHAR(100),
    template_variables JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    error_code VARCHAR(50),
    external_id VARCHAR(255),
    external_reference VARCHAR(255),
    provider_response JSONB,
    webhook_url TEXT,
    webhook_method VARCHAR(10),
    webhook_headers JSONB,
    webhook_payload JSONB,
    phone_number VARCHAR(20),
    slack_channel VARCHAR(100),
    slack_user_id VARCHAR(50),
    teams_channel VARCHAR(100),
    tracking_id VARCHAR(100) UNIQUE,
    correlation_id VARCHAR(100),
    batch_id VARCHAR(100),
    additional_metadata JSONB,
    cost_cents INTEGER,
    cost_currency VARCHAR(3),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for Notification
CREATE INDEX IF NOT EXISTS idx_notification_case_id ON casemanagement.notification(case_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON casemanagement.notification(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_type ON casemanagement.notification(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_status ON casemanagement.notification(status);
CREATE INDEX IF NOT EXISTS idx_notification_sent_at ON casemanagement.notification(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_channel ON casemanagement.notification(channel);
CREATE INDEX IF NOT EXISTS idx_notification_tracking_id ON casemanagement.notification(tracking_id);
CREATE INDEX IF NOT EXISTS idx_notification_correlation_id ON casemanagement.notification(correlation_id);
CREATE INDEX IF NOT EXISTS idx_notification_batch_id ON casemanagement.notification(batch_id);
CREATE INDEX IF NOT EXISTS idx_notification_retry ON casemanagement.notification(status, retry_count, max_retries);
CREATE INDEX IF NOT EXISTS idx_notification_scheduled ON casemanagement.notification(status, scheduled_at);

-- Add missing fields to existing AlertRule table
ALTER TABLE casemanagement.alert_rules 
ADD COLUMN IF NOT EXISTS grafana_version BIGINT,
ADD COLUMN IF NOT EXISTS rule_group VARCHAR(255) DEFAULT 'CaseTools',
ADD COLUMN IF NOT EXISTS team VARCHAR(255) DEFAULT 'Revenue Assurance',
ADD COLUMN IF NOT EXISTS for_duration INTEGER,
ADD COLUMN IF NOT EXISTS evaluation_interval_seconds INTEGER,
ADD COLUMN IF NOT EXISTS sql_query TEXT;

-- Update existing AlertRule records to populate sql_query from query
UPDATE casemanagement.alert_rules 
SET sql_query = query 
WHERE sql_query IS NULL AND query IS NOT NULL;

-- Add foreign key constraints
ALTER TABLE casemanagement.grafana_alert 
ADD CONSTRAINT IF NOT EXISTS fk_grafana_alert_case 
FOREIGN KEY (case_id) REFERENCES casemanagement.case(id) ON DELETE SET NULL;

ALTER TABLE casemanagement.case_history 
ADD CONSTRAINT IF NOT EXISTS fk_case_history_case 
FOREIGN KEY (case_id) REFERENCES casemanagement.case(id) ON DELETE CASCADE;

ALTER TABLE casemanagement.case_history 
ADD CONSTRAINT IF NOT EXISTS fk_case_history_changed_by 
FOREIGN KEY (changed_by) REFERENCES casemanagement.users(id) ON DELETE SET NULL;

ALTER TABLE casemanagement.case_history 
ADD CONSTRAINT IF NOT EXISTS fk_case_history_old_assignee 
FOREIGN KEY (old_assignee_id) REFERENCES casemanagement.users(id) ON DELETE SET NULL;

ALTER TABLE casemanagement.case_history 
ADD CONSTRAINT IF NOT EXISTS fk_case_history_new_assignee 
FOREIGN KEY (new_assignee_id) REFERENCES casemanagement.users(id) ON DELETE SET NULL;

ALTER TABLE casemanagement.case_history 
ADD CONSTRAINT IF NOT EXISTS fk_case_history_old_team 
FOREIGN KEY (old_team_id) REFERENCES casemanagement.teams(id) ON DELETE SET NULL;

ALTER TABLE casemanagement.case_history 
ADD CONSTRAINT IF NOT EXISTS fk_case_history_new_team 
FOREIGN KEY (new_team_id) REFERENCES casemanagement.teams(id) ON DELETE SET NULL;

ALTER TABLE casemanagement.notification 
ADD CONSTRAINT IF NOT EXISTS fk_notification_case 
FOREIGN KEY (case_id) REFERENCES casemanagement.case(id) ON DELETE SET NULL;

ALTER TABLE casemanagement.notification 
ADD CONSTRAINT IF NOT EXISTS fk_notification_user 
FOREIGN KEY (recipient_user_id) REFERENCES casemanagement.users(id) ON DELETE SET NULL;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_grafana_alert_updated_at 
    BEFORE UPDATE ON casemanagement.grafana_alert 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_history_updated_at 
    BEFORE UPDATE ON casemanagement.case_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_updated_at 
    BEFORE UPDATE ON casemanagement.notification 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for reporting
CREATE OR REPLACE VIEW casemanagement.v_case_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_cases,
    COUNT(*) FILTER (WHERE status = 'OPEN') as open_cases,
    COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_cases,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_cases,
    COUNT(*) FILTER (WHERE sla_breached = true) as sla_breached_cases,
    AVG(resolution_time_minutes) FILTER (WHERE resolution_time_minutes IS NOT NULL) as avg_resolution_time
FROM casemanagement.case 
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

CREATE OR REPLACE VIEW casemanagement.v_alert_metrics AS
SELECT 
    DATE_TRUNC('day', webhook_received_at) as date,
    COUNT(*) as total_alerts,
    COUNT(*) FILTER (WHERE status = 'firing') as firing_alerts,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
    COUNT(*) FILTER (WHERE processed = true) as processed_alerts,
    COUNT(*) FILTER (WHERE processing_error IS NOT NULL) as failed_alerts
FROM casemanagement.grafana_alert 
GROUP BY DATE_TRUNC('day', webhook_received_at)
ORDER BY date;

CREATE OR REPLACE VIEW casemanagement.v_notification_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    channel,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE status IN ('SENT', 'DELIVERED', 'READ')) as successful_notifications,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_notifications,
    AVG(EXTRACT(EPOCH FROM (sent_at - created_at))/60) FILTER (WHERE sent_at IS NOT NULL) as avg_delivery_time_minutes
FROM casemanagement.notification 
GROUP BY DATE_TRUNC('day', created_at), channel
ORDER BY date, channel;

-- Grant permissions (adjust as needed for your environment)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA casemanagement TO casetools_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA casemanagement TO casetools_app;
GRANT SELECT ON ALL TABLES IN SCHEMA casemanagement TO casetools_readonly;

-- Insert sample data for testing (optional)
INSERT INTO casemanagement.notification (
    notification_type, channel, priority, subject, message, status, recipient_email
) VALUES (
    'SYSTEM_STARTUP', 'EMAIL', 'NORMAL', 'CaseTools System Started', 
    'The CaseTools system has been successfully started and is ready to process alerts.',
    'SENT', 'admin@elite.com'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE casemanagement.grafana_alert IS 'Stores raw Grafana alert data for processing and auditing';
COMMENT ON TABLE casemanagement.case_history IS 'Tracks all changes made to cases for auditing';
COMMENT ON TABLE casemanagement.notification IS 'Stores notification delivery tracking across multiple channels';
COMMENT ON VIEW casemanagement.v_case_metrics IS 'Daily aggregated case metrics for reporting';
COMMENT ON VIEW casemanagement.v_alert_metrics IS 'Daily aggregated alert metrics for reporting';
COMMENT ON VIEW casemanagement.v_notification_metrics IS 'Daily aggregated notification metrics by channel';