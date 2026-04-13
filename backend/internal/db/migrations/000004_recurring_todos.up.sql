ALTER TABLE todos
  ADD COLUMN recurrence_rule      TEXT CHECK (recurrence_rule IN ('daily', 'weekdays', 'weekly', 'monthly')),
  ADD COLUMN recurrence_end_date  DATE;
