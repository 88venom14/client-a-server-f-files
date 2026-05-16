import { api, uploadFile, absoluteUrl } from '@/lib/api';
import type { FileRow, FolderRow } from '@/types';

export interface ListParams {
  folderId: string | null;
  search?: string;
  sortKey?: 'name' | 'updated_at' | 'size_bytes';
  sortDir?: 'asc' | 'desc';
  mimePrefix?: string;
}

interface SignedURL {
  url: string;
  expires_at: string;
}

function qs(params: Record<string, string | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const filesApi = {
  listFolders(parentId: string | null): Promise<FolderRow[]> {
    return api.get<FolderRow[]>(`/api/folders${qs({ parent_id: parentId })}`);
  },

  listFiles(params: ListParams): Promise<FileRow[]> {
    return api.get<FileRow[]>(
      `/api/files${qs({
        folder_id: params.folderId,
        search:    params.search,
        mime:      params.mimePrefix,
        sort:      params.sortKey,
        dir:       params.sortDir,
      })}`,
    );
  },

  createFolder(name: string, parentId: string | null): Promise<FolderRow> {
    return api.post<FolderRow>('/api/folders', { name, parent_id: parentId });
  },

  renameFolder(id: string, name: string): Promise<FolderRow> {
    return api.patch<FolderRow>(`/api/folders/${id}`, { name });
  },

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`/api/folders/${id}`);
  },

  uploadFile(opts: {
    file: File;
    folderId: string | null;
    onProgress?: (loaded: number, total: number) => void;
  }): Promise<FileRow> {
    const fd = new FormData();
    fd.append('file', opts.file);
    if (opts.folderId) fd.append('folder_id', opts.folderId);
    return uploadFile<FileRow>('/api/files', fd, opts.onProgress);
  },

  renameFile(id: string, name: string): Promise<FileRow> {
    return api.patch<FileRow>(`/api/files/${id}`, { name });
  },

  async deleteFile(id: string, _storagePath: string): Promise<void> {
    await api.delete(`/api/files/${id}`);
  },

  async signedDownloadUrl(fileId: string): Promise<string> {
    const r = await api.get<SignedURL>(`/api/files/${fileId}/url`);
    return absoluteUrl(r.url);
  },

  async signedAttachmentUrl(fileId: string): Promise<string> {
    const r = await api.get<SignedURL>(`/api/files/${fileId}/url?attachment=1`);
    return absoluteUrl(r.url);
  },

  listTrash(): Promise<FileRow[]> {
    return api.get<FileRow[]>('/api/trash');
  },

  restoreFile(id: string): Promise<FileRow> {
    return api.post<FileRow>(`/api/trash/${id}/restore`);
  },

  async purgeFile(id: string, _storagePath: string): Promise<void> {
    await api.delete(`/api/trash/${id}`);
  },

  async createShareLink(id: string): Promise<string> {
    const r = await api.post<{ token: string }>(`/api/files/${id}/share`);
    return r.token;
  },

  async revokeShareLink(id: string): Promise<void> {
    await api.delete(`/api/files/${id}/share`);
  },

  async createFolderShareLink(id: string): Promise<string> {
    const r = await api.post<{ token: string }>(`/api/folders/${id}/share`);
    return r.token;
  },

  async revokeFolderShareLink(id: string): Promise<void> {
    await api.delete(`/api/folders/${id}/share`);
  },

  listFilesRecursive(folderId: string): Promise<{ path: string; row: FileRow }[]> {
    return api.get<{ path: string; row: FileRow }[]>(`/api/folders/${folderId}/files-recursive`);
  },

  folderPath(folderId: string | null): Promise<FolderRow[]> {
    if (!folderId) return Promise.resolve([]);
    return api.get<FolderRow[]>(`/api/folders/${folderId}/path`);
  },
};
