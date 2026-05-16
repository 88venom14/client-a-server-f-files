CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS folders (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id  UUID REFERENCES folders(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS folders_unique_name_in_parent
    ON folders (owner_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS folders_owner_parent_idx
    ON folders (owner_id, parent_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS files (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id    UUID REFERENCES folders(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    storage_path TEXT UNIQUE NOT NULL,
    mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
    size_bytes   BIGINT NOT NULL DEFAULT 0,
    is_public    BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS files_owner_folder_idx
    ON files (owner_id, folder_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS files_owner_trash_idx
    ON files (owner_id, deleted_at)
    WHERE deleted_at IS NOT NULL;
