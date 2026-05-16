export type { FileRow, FolderRow, User } from './database';

export type FileKind = 'folder' | 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'binary';

export type SortKey = 'name' | 'size_bytes' | 'updated_at';
export type SortDir = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export interface UploadProgress {
  id: string;
  file: File;
  loaded: number;
  total: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}
