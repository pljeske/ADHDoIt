ALTER TABLE users ADD COLUMN oidc_subject TEXT;
CREATE UNIQUE INDEX users_oidc_subject_idx ON users(oidc_subject) WHERE oidc_subject IS NOT NULL;
