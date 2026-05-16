import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesApi, type ListParams } from './filesApi';
import type { FileRow, FolderRow } from '@/types';

const keys = {
  all: ['files'] as const,
  list: (p: ListParams) => ['files', 'list', p] as const,
  folders: (parent: string | null) => ['folders', 'list', parent] as const,
  path: (id: string | null) => ['folders', 'path', id] as const,
};

export function useFolderListing(params: ListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => filesApi.listFiles(params),
  });
}

export function useSubfolders(parentId: string | null) {
  return useQuery({
    queryKey: keys.folders(parentId),
    queryFn: () => filesApi.listFolders(parentId),
  });
}

export function useFolderPath(folderId: string | null) {
  return useQuery({
    queryKey: keys.path(folderId),
    queryFn: () => filesApi.folderPath(folderId),
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { name: string; parentId: string | null }) =>
      filesApi.createFolder(p.name, p.parentId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.folders(vars.parentId) });
    },
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      file: File;
      folderId: string | null;
      onProgress?: (loaded: number, total: number) => void;
    }) => filesApi.uploadFile(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRenameFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; name: string }) => filesApi.renameFile(p.id, p.name),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: keys.all });
      const snapshot = qc.getQueriesData<FileRow[]>({ queryKey: keys.all });
      snapshot.forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData(
          key,
          data.map((f) => (f.id === vars.id ? { ...f, name: vars.name } : f)),
        );
      });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; storage_path: string }) =>
      filesApi.deleteFile(p.id, p.storage_path),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export type { FileRow, FolderRow };
