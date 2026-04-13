ALTER TABLE todos
  DROP COLUMN IF EXISTS recurrence_rule,
  DROP COLUMN IF EXISTS recurrence_end_date;
