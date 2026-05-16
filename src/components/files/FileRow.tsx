import { memo, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatSize, iconForKind, kindFromMime } from '@/features/files/fileKind';
import type { FileRow as FileRowT, FolderRow } from '@/types';

export type EntryUnion = FileRowT | (FolderRow & { __folder: true });

interface Props {
  entry: EntryUnion;
  selected: boolean;
  onSelect: (entry: EntryUnion) => void;
  onActivate: (entry: EntryUnion) => void;
}

function FileRowImpl({ entry, selected, onSelect, onActivate }: Props) {
  const isFolder = '__folder' in entry;
  const kind = isFolder ? 'folder' : kindFromMime(entry.mime_type);
  const icons = iconForKind(kind);
  const size = isFolder ? '' : formatSize(entry.size_bytes);
  const date = new Date(entry.updated_at).toLocaleDateString();

  const handleClick = useCallback(() => onSelect(entry), [entry, onSelect]);
  const handleDoubleClick = useCallback(() => onActivate(entry), [entry, onActivate]);

  return (
    <div
      className={`row${selected ? ' selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <Icon name={icons.row} />
      <span className="name">{entry.name}</span>
      <span className="size">{size}</span>
      <span className="date">{date}</span>
    </div>
  );
}

export const FileRow = memo(FileRowImpl);
