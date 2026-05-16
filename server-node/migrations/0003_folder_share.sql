ALTER TABLE folders ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS folders_public_token_idx
  ON folders (public_token)
  WHERE public_token IS NOT NULL AND deleted_at IS NULL;
