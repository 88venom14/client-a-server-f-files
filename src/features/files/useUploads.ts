import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadFile } from './useFiles';
import { filesApi } from './filesApi';
import { validateFile } from './fileKind';
import { useToast } from '@/components/ui/Toast';
import type { UploadProgress } from '@/types';

interface FileWithPath {
  file: File;
  relativePath: string;
}

export function useUploads(folderId: string | null) {
  const [items, setItems] = useState<UploadProgress[]>([]);
  const upload = useUploadFile();
  const { show } = useToast();
  const qc = useQueryClient();

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadProgress>) =>
      setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    [],
  );

  const ensureFolderChain = useCallback(
    async (folderCache: Map<string, string | null>, parts: string[]): Promise<string | null> => {
      let parentId = folderId;
      let path = '';
      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        if (folderCache.has(path)) {
          parentId = folderCache.get(path) ?? null;
          continue;
        }
        try {
          const created = await filesApi.createFolder(part, parentId);
          folderCache.set(path, created.id);
          parentId = created.id;
        } catch (e) {
          if ((e as { status?: number }).status === 409) {
            const sibs = await filesApi.listFolders(parentId);
            const found = sibs.find((s) => s.name === part);
            if (!found) throw e;
            folderCache.set(path, found.id);
            parentId = found.id;
          } else {
            throw e;
          }
        }
      }
      return parentId;
    },
    [folderId],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      const withPaths: FileWithPath[] = arr.map((f) => ({
        file: f,
        relativePath: (f as File & { webkitRelativePath?: string }).webkitRelativePath || '',
      }));

      const next: UploadProgress[] = withPaths.map((w) => ({
        id: crypto.randomUUID(),
        file: w.file,
        loaded: 0,
        total: w.file.size,
        status: 'pending',
      }));
      setItems((cur) => [...cur, ...next]);

      const folderCache = new Map<string, string | null>();
      folderCache.set('', folderId);

      let foldersCreated = false;

      for (let i = 0; i < withPaths.length; i++) {
        const item = next[i];
        const { file, relativePath } = withPaths[i];

        const err = validateFile(file);
        if (err) {
          updateItem(item.id, { status: 'error', error: err });
          show(err, 'err');
          continue;
        }

        let targetFolderId = folderId;
        if (relativePath && relativePath.includes('/')) {
          const parts = relativePath.split('/');
          parts.pop();
          try {
            targetFolderId = await ensureFolderChain(folderCache, parts);
            foldersCreated = true;
          } catch (e) {
            updateItem(item.id, { status: 'error', error: (e as Error).message });
            show(`Не удалось создать папку для ${file.name}`, 'err');
            continue;
          }
        }

        updateItem(item.id, { status: 'uploading' });
        try {
          await upload.mutateAsync({
            file,
            folderId: targetFolderId,
            onProgress: (loaded, total) => updateItem(item.id, { loaded, total }),
          });
          updateItem(item.id, { status: 'done', loaded: item.total });
        } catch (e) {
          updateItem(item.id, { status: 'error', error: (e as Error).message });
          show(`Ошибка загрузки: ${file.name}`, 'err');
        }
      }

      const ok = next.filter((n) => items.find((i) => i.id === n.id)?.status !== 'error').length;
      if (ok > 0) show(`Загружено: ${ok} ${ok === 1 ? 'файл' : 'файлов'}`, 'ok');
      if (foldersCreated) qc.invalidateQueries({ queryKey: ['folders'] });
    },
    [folderId, ensureFolderChain, updateItem, upload, show, qc, items],
  );

  const clear = useCallback(() => setItems([]), []);

  return useMemo(() => ({ items, handleFiles, clear }), [items, handleFiles, clear]);
}
