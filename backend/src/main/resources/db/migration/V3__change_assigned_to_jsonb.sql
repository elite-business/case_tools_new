-- Migration to change assigned_to from single user FK to JSONB with userIds and teamIds

-- Add new JSONB column for assignments
ALTER TABLE casemanagement."case" 
ADD COLUMN assigned_to_json JSONB DEFAULT '{"userIds": [], "teamIds": []}'::jsonb;

ALTER TABLE casemanagement.alert_history 
ADD COLUMN assigned_to_json JSONB DEFAULT '{"userIds": [], "teamIds": []}'::jsonb;

-- Migrate existing data from assigned_to FK to JSONB format
UPDATE casemanagement."case" 
SET assigned_to_json = 
    CASE 
        WHEN assigned_to IS NOT NULL 
        THEN jsonb_build_object('userIds', jsonb_build_array(assigned_to), 'teamIds', jsonb_build_array())
        ELSE '{"userIds": [], "teamIds": []}'::jsonb
    END;

UPDATE casemanagement.alert_history 
SET assigned_to_json = 
    CASE 
        WHEN assigned_to_id IS NOT NULL 
        THEN jsonb_build_object('userIds', jsonb_build_array(assigned_to_id), 'teamIds', jsonb_build_array())
        ELSE '{"userIds": [], "teamIds": []}'::jsonb
    END;

-- Drop the old FK constraints
ALTER TABLE casemanagement."case" 
DROP CONSTRAINT IF EXISTS fkqn81qxmhp8aylksaeb9a6h125;

ALTER TABLE casemanagement.alert_history 
DROP CONSTRAINT IF EXISTS fklbuqq20o4wsskqlls3nqgx35u;

-- Drop the old columns
ALTER TABLE casemanagement."case" 
DROP COLUMN assigned_to;

ALTER TABLE casemanagement.alert_history 
DROP COLUMN assigned_to_id;

-- Rename new columns to original names
ALTER TABLE casemanagement."case" 
RENAME COLUMN assigned_to_json TO assigned_to;

ALTER TABLE casemanagement.alert_history 
RENAME COLUMN assigned_to_json TO assigned_to;

-- Create indexes for JSONB queries
CREATE INDEX idx_case_assigned_user_ids ON casemanagement."case" USING gin ((assigned_to->'userIds'));
CREATE INDEX idx_case_assigned_team_ids ON casemanagement."case" USING gin ((assigned_to->'teamIds'));
CREATE INDEX idx_alert_assigned_user_ids ON casemanagement.alert_history USING gin ((assigned_to->'userIds'));
CREATE INDEX idx_alert_assigned_team_ids ON casemanagement.alert_history USING gin ((assigned_to->'teamIds'));