import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, absoluteUrl } from '@/lib/api';
import { formatSize, kindFromMime, iconForKind } from '@/features/files/fileKind';
import { Icon } from '@/components/ui/Icon';

interface FileInfo {
  type: 'file';
  name: string;
  mime_type: string;
  size_bytes: number;
}

interface FolderItem {
  id: string;
  name: string;
  path: string;
  mime_type: string;
  size_bytes: number;
}

interface FolderInfo {
  type: 'folder';
  name: string;
  items: FolderItem[];
}

type ShareInfo = FileInfo | FolderInfo;

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get<ShareInfo>(`/share/${token}/info`)
      .then(setInfo)
      .catch((e) => setError(e.message || 'Ссылка недействительна'));
  }, [token]);

  if (error) {
    return (
      <div className="auth-screen">
        <div className="panel auth-card">
          <h1 className="panel-title">ОШИБКА</h1>
          <p style={{ fontFamily: 'VT323, monospace', fontSize: 16, color: '#cfe9ff' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return <div className="center-screen">ЗАГРУЗКА…</div>;
  }

  if (info.type === 'folder') {
    return <FolderShareView token={token!} folder={info} />;
  }

  return <FileShareView token={token!} file={info} />;
}

function FileShareView({ token, file }: { token: string; file: FileInfo }) {
  const kind = kindFromMime(file.mime_type);
  const iconName = iconForKind(kind).preview;
  const fileUrl = absoluteUrl(`/share/${token}/content`);
  const downloadUrl = absoluteUrl(`/share/${token}/content?download=1`);

  return (
    <div className="auth-screen">
      <div className="panel auth-card share-card">
        <h1 className="panel-title">С вами поделились файлом</h1>

        <div className="share-icon">
          <Icon name={iconName} />
        </div>

        <div className="share-info">
          <div className="share-name" title={file.name}>{file.name}</div>
          <div className="share-meta">
            {formatSize(file.size_bytes)} · {file.mime_type}
          </div>
        </div>

        <a className="btn-pixel" href={downloadUrl} download={file.name}>
          СКАЧАТЬ
        </a>

        {kind === 'image' && (
          <img
            src={fileUrl}
            alt={file.name}
            style={{ maxWidth: '100%', maxHeight: 320, marginTop: 8 }}
          />
        )}
      </div>
    </div>
  );
}

function FolderShareView({ token, folder }: { token: string; folder: FolderInfo }) {
  const totalSize = folder.items.reduce((s, i) => s + i.size_bytes, 0);
  const zipUrl = absoluteUrl(`/share/${token}/zip`);

  return (
    <div className="auth-screen">
      <div className="panel share-folder-card">
        <h1 className="panel-title">С вами поделились папкой</h1>

        <div className="share-folder-header">
          <div className="share-folder-icon">
            <Icon name="big-folder" />
          </div>
          <div className="share-info">
            <div className="share-name" title={folder.name}>{folder.name}</div>
            <div className="share-meta">
              {folder.items.length} {pluralFiles(folder.items.length)} · {formatSize(totalSize)}
            </div>
          </div>
        </div>

        <a className="btn-pixel share-folder-zip" href={zipUrl} download={`${folder.name}.zip`}>
          СКАЧАТЬ ВСЁ (ZIP)
        </a>

        <div className="share-folder-list">
          {folder.items.length === 0 && (
            <div className="share-folder-empty">Папка пуста</div>
          )}
          {folder.items.map((it) => {
            const dl = absoluteUrl(`/share/${token}/file/${it.id}?download=1`);
            return (
              <a key={it.id} className="share-folder-item" href={dl} download={it.name}>
                <Icon name={iconForKind(kindFromMime(it.mime_type)).row} />
                <span className="path" title={it.path}>{it.path}</span>
                <span className="size">{formatSize(it.size_bytes)}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function pluralFiles(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'файл';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'файла';
  return 'файлов';
}
