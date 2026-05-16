import { memo, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { iconForKind, kindFromMime, formatSize } from '@/features/files/fileKind';
import type { FileRow as FileRowT, FolderRow } from '@/types';

export type EntryUnion = FileRowT | (FolderRow & { __folder: true });

interface Props {
  entry: EntryUnion;
  selected: boolean;
  onSelect: (entry: EntryUnion) => void;
  onActivate: (entry: EntryUnion) => void;
}

function FileCardImpl({ entry, selected, onSelect, onActivate }: Props) {
  const isFolder = '__folder' in entry;
  const kind = isFolder ? 'folder' : kindFromMime(entry.mime_type);
  const icons = iconForKind(kind);

  const handleClick = useCallback(() => onSelect(entry), [entry, onSelect]);
  const handleDoubleClick = useCallback(() => onActivate(entry), [entry, onActivate]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`grid-card${selected ? ' selected' : ''}`}
    >
      <Icon name={icons.preview} />
      <span className="name">{entry.name}</span>
      {!isFolder && <span className="size">{formatSize(entry.size_bytes)}</span>}
    </div>
  );
}

export const FileCard = memo(FileCardImpl);
