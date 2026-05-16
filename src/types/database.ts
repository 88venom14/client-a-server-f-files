export type FileRow = {
  id: string;
  owner_id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  is_public: boolean;
  public_token: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FolderRow = {
  id: string;
  owner_id: string;
  parent_id: string | null;
  name: string;
  public_token: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};
