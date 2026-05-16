import { filesApi } from './filesApi';

export async function downloadFolderAsZip(opts: {
  folderId: string;
  folderName: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<void> {
  const { default: JSZip } = await import('jszip');

  const entries = await filesApi.listFilesRecursive(opts.folderId);

  if (entries.length === 0) {
    throw new Error('Папка пуста');
  }

  const zip = new JSZip();
  const root = zip.folder(opts.folderName) ?? zip;

  let done = 0;
  for (const { path, row } of entries) {
    const url = await filesApi.signedDownloadUrl(row.id);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Не удалось скачать ${row.name}: ${res.status}`);
    const blob = await res.blob();
    root.file(path, blob);
    done++;
    opts.onProgress?.(done, entries.length);
  }

  const out = await zip.generateAsync({ type: 'blob' });
  const objectUrl = URL.createObjectURL(out);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `${opts.folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
