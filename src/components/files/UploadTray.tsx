import { memo } from 'react';
import type { UploadProgress } from '@/types';

const STATUS_LABELS: Record<UploadProgress['status'], string> = {
  pending: 'ожидание',
  uploading: 'загрузка…',
  done: 'готово',
  error: 'ошибка',
};

function statusLabel(s: UploadProgress['status']) {
  return STATUS_LABELS[s] ?? s;
}

interface Props {
  items: UploadProgress[];
  onClear: () => void;
}

function UploadTrayImpl({ items, onClear }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="upload-tray">
      <header>
        <span>ЗАГРУЗКИ</span>
        <button onClick={onClear} className="modal-close" type="button" aria-label="Закрыть">X</button>
      </header>
      {items.map((i) => (
        <div key={i.id} className="item">
          <div className="name">{i.file.name}</div>
          <div className={`bar ${i.status === 'error' ? 'err' : ''}`}>
            <div style={{ width: `${i.total ? (i.loaded / i.total) * 100 : 0}%` }} />
          </div>
          <div className="status">
            {statusLabel(i.status)}{i.error ? ` — ${i.error}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

export const UploadTray = memo(UploadTrayImpl);
