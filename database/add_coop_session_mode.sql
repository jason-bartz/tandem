-- Add mode column to alchemy_coop_sessions
-- Valid values: 'creative' (free play co-op) or 'daily' (today's puzzle co-op)
-- Default 'creative' preserves backward compatibility with existing sessions
ALTER TABLE alchemy_coop_sessions ADD COLUMN mode VARCHAR(20) NOT NULL DEFAULT 'creative';
