-- Add triggered_at column to alert_history table if it doesn't exist
ALTER TABLE casemanagement.alert_history 
ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP;

-- Update existing records to set triggered_at from created_at
UPDATE casemanagement.alert_history 
SET triggered_at = created_at 
WHERE triggered_at IS NULL;

-- Create index on triggered_at for better query performance
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at 
ON casemanagement.alert_history(triggered_at DESC);