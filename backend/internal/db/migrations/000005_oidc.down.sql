DROP INDEX IF EXISTS users_oidc_subject_idx;
ALTER TABLE users DROP COLUMN IF EXISTS oidc_subject;
