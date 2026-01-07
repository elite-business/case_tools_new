-- Create team_members join table to link teams and users
CREATE TABLE IF NOT EXISTS casemanagement.team_members (
    team_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (team_id, user_id),
    CONSTRAINT fk_team_members_team 
        FOREIGN KEY (team_id) 
        REFERENCES casemanagement.team(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user 
        FOREIGN KEY (user_id) 
        REFERENCES casemanagement.userlogin(id) 
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON casemanagement.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON casemanagement.team_members(user_id);

-- Drop the old team_member table if it exists
DROP TABLE IF EXISTS casemanagement.team_member CASCADE;