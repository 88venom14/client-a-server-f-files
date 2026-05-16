import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useFolderListing, useFolderPath, useSubfolders,
  useCreateFolder, useDeleteFile, useRenameFile,
} from '@/features/files/useFiles';
import { useUploads } from '@/features/files/useUploads';
import { downloadFolderAsZip } from '@/features/files/downloadFolder';
import { filesApi } from '@/features/files/filesApi';
import { Breadcrumbs } from '@/components/files/Breadcrumbs';
import { SearchBar } from '@/components/files/SearchBar';
import { FileRow } from '@/components/files/FileRow';
import { FileCard } from '@/components/files/FileCard';
import { UploadTray } from '@/components/files/UploadTray';
import { PreviewPane } from '@/components/files/PreviewPane';
import { RenameModal } from '@/components/files/RenameModal';
import { NewFolderModal } from '@/components/files/NewFolderModal';
import { FileListSkeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import type { FileRow as FileRowT, FolderRow, SortDir, SortKey, ViewMode } from '@/types';

type Modal = 'rename' | 'new-folder' | null;
type SelectionKind = 'file' | 'folder' | null;

export function ExplorerPage() {
  const { folderId = null } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [view, setView] = useState<ViewMode>('list');
  const [mimeFilter, setMimeFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<SelectionKind>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [dragOver, setDragOver] = useState(false);
  const [zipping, setZipping] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);

  const { show } = useToast();
  const folders = useSubfolders(folderId);
  const files = useFolderListing({
    folderId, search: search || undefined, sortKey, sortDir,
    mimePrefix: mimeFilter || undefined,
  });
  const path = useFolderPath(folderId);
  const createFolder = useCreateFolder();
  const renameFile = useRenameFile();
  const deleteFile = useDeleteFile();
  const uploads = useUploads(folderId);

  const entries = useMemo(() => {
    const fs: (FolderRow & { __folder: true })[] =
      (folders.data ?? []).map((f) => ({ ...f, __folder: true as const }));
    return [...fs, ...(files.data ?? [])];
  }, [folders.data, files.data]);

  const selectedFile = useMemo(
    () => (selectedKind === 'file'
      ? (files.data ?? []).find((f) => f.id === selectedId) ?? null
      : null),
    [files.data, selectedId, selectedKind],
  );
  const selectedFolder = useMemo(
    () => (selectedKind === 'folder'
      ? (folders.data ?? []).find((f) => f.id === selectedId) ?? null
      : null),
    [folders.data, selectedId, selectedKind],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedKind(null);
  }, []);

  const onEntryClick = useCallback((e: FileRowT | (FolderRow & { __folder: true })) => {
    if ('__folder' in e) {
      setSelectedKind('folder');
      setSelectedId(e.id);
      return;
    }
    setSelectedKind('file');
    setSelectedId(e.id);
  }, []);

  const onEntryActivate = useCallback((e: FileRowT | (FolderRow & { __folder: true })) => {
    if ('__folder' in e) {
      setSelectedId(null);
      setSelectedKind(null);
      navigate(`/folders/${e.id}`);
    }
  }, [navigate]);

  const onDelete = useCallback(async () => {
    if (selectedFile) {
      if (!confirm(`Удалить ${selectedFile.name}?`)) return;
      await deleteFile.mutateAsync({ id: selectedFile.id, storage_path: selectedFile.storage_path });
      show('Файл удалён', 'ok');
      clearSelection();
      return;
    }
    if (selectedFolder) {
      if (!confirm(`Удалить папку ${selectedFolder.name} со всем содержимым?`)) return;
      try {
        await filesApi.deleteFolder(selectedFolder.id);
        show('Папка удалена', 'ok');
        clearSelection();
        await qc.invalidateQueries({ queryKey: ['folders'] });
        await qc.invalidateQueries({ queryKey: ['files'] });
      } catch (e) {
        show((e as Error).message, 'err');
      }
    }
  }, [selectedFile, selectedFolder, deleteFile, show, clearSelection, qc]);

  const onFolderDownload = useCallback(async (folder: FolderRow) => {
    setZipping(folder.id);
    show(`Архивирование ${folder.name}…`, 'info');
    try {
      await downloadFolderAsZip({ folderId: folder.id, folderName: folder.name });
      show(`Скачано: ${folder.name}.zip`, 'ok');
    } catch (e) {
      show((e as Error).message, 'err');
    } finally {
      setZipping(null);
    }
  }, [show]);

  const onDownloadCurrent = useCallback(async () => {
    if (!folderId) {
      show('Папка не выбрана', 'err');
      return;
    }
    const current = path.data?.[path.data.length - 1];
    if (!current) return;
    onFolderDownload(current);
  }, [folderId, path.data, onFolderDownload, show]);

  const onDownloadSelectedFolder = useCallback(() => {
    if (selectedFolder) onFolderDownload(selectedFolder);
  }, [selectedFolder, onFolderDownload]);

  const onPreviewRename = useCallback(() => setModal('rename'), []);
  const onModalClose = useCallback(() => setModal(null), []);

  const onRenameConfirm = useCallback(async (name: string) => {
    try {
      if (selectedFile) {
        await renameFile.mutateAsync({ id: selectedFile.id, name });
      } else if (selectedFolder) {
        await filesApi.renameFolder(selectedFolder.id, name);
        await qc.invalidateQueries({ queryKey: ['folders'] });
      }
      show('Переименовано', 'ok');
    } catch (e) {
      show((e as Error).message, 'err');
    }
    setModal(null);
  }, [selectedFile, selectedFolder, renameFile, show, qc]);

  const onCreateFolderConfirm = useCallback(async (name: string) => {
    try {
      await createFolder.mutateAsync({ name, parentId: folderId });
      show('Папка создана', 'ok');
    } catch (e) {
      show((e as Error).message, 'err');
    }
    setModal(null);
  }, [createFolder, folderId, show]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploads.handleFiles(e.dataTransfer.files);
  }, [uploads]);

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploads.handleFiles(e.target.files);
    e.target.value = '';
  }, [uploads]);

  const triggerFileSelect = useCallback(() => {
    if (fileInput.current) {
      fileInput.current.value = '';
      fileInput.current.click();
    }
  }, []);

  const triggerFolderSelect = useCallback(() => {
    if (folderInput.current) {
      folderInput.current.value = '';
      folderInput.current.click();
    }
  }, []);

  const toggleView = useCallback(
    () => setView((v) => (v === 'list' ? 'grid' : 'list')),
    [],
  );
  const openNewFolderModal = useCallback(() => setModal('new-folder'), []);
  const onMimeFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setMimeFilter(e.target.value),
    [],
  );
  const onSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [k, d] = e.target.value.split(':') as [SortKey, SortDir];
    setSortKey(k); setSortDir(d);
  }, []);

  const currentName = selectedFile?.name ?? selectedFolder?.name ?? '';

  return (
    <div
      className={`explorer${selectedId ? ' preview-open' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={dragOver ? { outline: '4px dashed var(--orange)', outlineOffset: -8 } : undefined}
    >
      <Breadcrumbs trail={path.data ?? []} />

      <div className="explorer-toolbar">
        <SearchBar value={search} onChange={setSearch} />
        <select className="rename-input" value={mimeFilter} onChange={onMimeFilterChange}>
          <option value="">ВСЕ ТИПЫ</option>
          <option value="image/">ИЗОБРАЖЕНИЯ</option>
          <option value="video/">ВИДЕО</option>
          <option value="audio/">АУДИО</option>
          <option value="application/pdf">PDF</option>
          <option value="text/">ТЕКСТ</option>
        </select>
        <select className="rename-input" value={`${sortKey}:${sortDir}`} onChange={onSortChange}>
          <option value="updated_at:desc">НОВЫЕ</option>
          <option value="updated_at:asc">СТАРЫЕ</option>
          <option value="name:asc">ИМЯ А→Я</option>
          <option value="name:desc">ИМЯ Я→А</option>
          <option value="size_bytes:desc">БОЛЬШИЕ</option>
          <option value="size_bytes:asc">МАЛЫЕ</option>
        </select>
        <button className="btn-pixel ghost" type="button" onClick={toggleView}>
          {view === 'list' ? 'СЕТКА' : 'СПИСОК'}
        </button>
        <button className="btn-pixel" type="button" onClick={openNewFolderModal}>+ ПАПКА</button>
        {folderId && (
          <button
            className="btn-pixel"
            type="button"
            onClick={onDownloadCurrent}
            disabled={zipping !== null}
          >{zipping ? 'АРХИВ…' : 'СКАЧАТЬ ZIP'}</button>
        )}
        <input
          ref={fileInput}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={onFileSelected}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={onFileSelected}
          {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
        />
        <button className="btn-pixel" type="button" onClick={triggerFileSelect}>ЗАГРУЗИТЬ ФАЙЛЫ</button>
        <button className="btn-pixel ghost" type="button" onClick={triggerFolderSelect}>ЗАГРУЗИТЬ ПАПКУ</button>
      </div>

      <div className="explorer-body">
        {(folders.isLoading || files.isLoading) && <FileListSkeleton />}
        {!folders.isLoading && !files.isLoading && entries.length === 0 && <EmptyState />}
        {view === 'list' ? (
          <div className="files">
            {entries.map((e) => (
              <FileRow
                key={e.id}
                entry={e}
                selected={selectedId === e.id}
                onSelect={onEntryClick}
                onActivate={onEntryActivate}
              />
            ))}
          </div>
        ) : (
          <div className="grid-view">
            {entries.map((e) => (
              <FileCard
                key={e.id}
                entry={e}
                selected={selectedId === e.id}
                onSelect={onEntryClick}
                onActivate={onEntryActivate}
              />
            ))}
          </div>
        )}
      </div>

      {selectedFile ? (
        <PreviewPane
          mode="file"
          file={selectedFile}
          onClose={clearSelection}
          onRename={onPreviewRename}
          onDelete={onDelete}
        />
      ) : selectedFolder ? (
        <PreviewPane
          mode="folder"
          folder={selectedFolder}
          onClose={clearSelection}
          onDownloadZip={onDownloadSelectedFolder}
          onRename={onPreviewRename}
          onDelete={onDelete}
        />
      ) : (
        <PreviewPane mode="empty" />
      )}

      <UploadTray items={uploads.items} onClear={uploads.clear} />

      {modal === 'rename' && (selectedFile || selectedFolder) && (
        <RenameModal
          currentName={currentName}
          onClose={onModalClose}
          onConfirm={onRenameConfirm}
        />
      )}
      {modal === 'new-folder' && (
        <NewFolderModal
          onClose={onModalClose}
          onConfirm={onCreateFolderConfirm}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <Icon name="big-folder" />
      <p style={{ fontSize: 10, letterSpacing: 1.5 }}>НЕТ ФАЙЛОВ</p>
      <p style={{ fontFamily: 'VT323, monospace', fontSize: 18 }}>
        Перетащите файлы или нажмите ЗАГРУЗИТЬ
      </p>
    </div>
  );
}
