ALTER TABLE files ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS files_public_token_idx
  ON files (public_token)
  WHERE public_token IS NOT NULL AND deleted_at IS NULL;
