import type { FileKind } from '@/types';

export function kindFromMime(mime: string | undefined | null): FileKind {
  if (!mime) return 'binary';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/') || mime === 'application/json') return 'text';
  return 'binary';
}

export function iconForKind(kind: FileKind) {
  switch (kind) {
    case 'folder': return { row: 'folder', preview: 'big-folder' } as const;
    case 'image': return { row: 'file-img', preview: 'big-landscape' } as const;
    case 'pdf':
    case 'text': return { row: 'file-txt', preview: 'big-doc' } as const;
    default: return { row: 'file-bin', preview: 'big-bin' } as const;
  }
}

export function formatSize(bytes?: number): string {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
export const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'text/', 'application/'];

export function validateFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Файл слишком большой (макс. ${formatSize(MAX_UPLOAD_BYTES)})`;
  }
  if (file.type && !ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
    return `Неподдерживаемый тип: ${file.type}`;
  }
  return null;
}
