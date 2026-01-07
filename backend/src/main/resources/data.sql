-- Initialize basic system settings
INSERT INTO casemanagement.system_setting (setting_key, setting_value, default_value, category, description, data_type, required, encrypted, validation_rules, created_at, updated_at)
VALUES 
('alert.retention.days', '90', '90', 'ALERT', 'Number of days to retain alert history', 'INTEGER', true, false, '^[1-9][0-9]*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('notification.email.enabled', 'true', 'true', 'NOTIFICATION', 'Enable email notifications', 'BOOLEAN', true, false, '^(true|false)$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('session.timeout.minutes', '60', '60', 'SECURITY', 'User session timeout in minutes', 'INTEGER', true, false, '^[1-9][0-9]*$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO NOTHING;

-- Create default teams if they don't exist
INSERT INTO casemanagement.team (name, description, department, location, contact_email, phone, active, specialization, created_at, updated_at)
VALUES 
('Network Operations Team', 'Responsible for network monitoring and incident response', 'IT Operations', 'Data Center A', 'netops@elite.com', '+1-555-0001', true, 'Network Infrastructure', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Security Team', 'Information security and threat response', 'Information Security', 'Building B', 'security@elite.com', '+1-555-0002', true, 'Cybersecurity', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Application Support Team', 'Application monitoring and support', 'Application Services', 'Building C', 'appsupport@elite.com', '+1-555-0003', true, 'Application Operations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;