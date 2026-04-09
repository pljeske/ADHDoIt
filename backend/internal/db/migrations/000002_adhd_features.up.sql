ALTER TABLE todos ADD COLUMN duration_minutes INTEGER CHECK (duration_minutes > 0);
ALTER TABLE todos ADD COLUMN subtasks JSONB NOT NULL DEFAULT '[]';
