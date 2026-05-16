import { useEffect, useState } from 'react';
import { filesApi } from '@/features/files/filesApi';
import { kindFromMime, iconForKind, formatSize } from '@/features/files/fileKind';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import type { FileRow, FolderRow, FileKind } from '@/types';

const KIND_LABELS: Record<FileKind, string> = {
  image: 'изображение',
  video: 'видео',
  audio: 'аудио',
  pdf: 'PDF',
  text: 'текст',
  binary: 'двоичный',
  folder: 'папка',
};

function shareUrlFor(token: string): string {
  return `${window.location.origin}/share/${token}`;
}

interface FileProps {
  mode: 'file';
  file: FileRow;
  onRename: () => void;
  onDelete: () => void;
  onClose?: () => void;
}

interface FolderProps {
  mode: 'folder';
  folder: FolderRow;
  onDownloadZip: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose?: () => void;
}

interface EmptyProps {
  mode: 'empty';
  onClose?: () => void;
}

export type PreviewPaneProps = FileProps | FolderProps | EmptyProps;

export function PreviewPane(props: PreviewPaneProps) {
  if (props.mode === 'empty') {
    return (
      <aside className="preview-pane">
        <PaneHeader onClose={props.onClose} />
        <div className="pp-empty">
          <Icon name="big-doc" />
          <span style={{ fontSize: 10, letterSpacing: 1.5 }}>ВЫБЕРИТЕ ФАЙЛ</span>
        </div>
      </aside>
    );
  }
  if (props.mode === 'folder') {
    return <FolderPreview {...props} />;
  }
  return <FilePreview {...props} />;
}

function PaneHeader({ onClose }: { onClose?: () => void }) {
  return (
    <div className="pp-header">
      <span>ПРОСМОТР</span>
      {onClose && (
        <button className="pp-close" type="button" onClick={onClose} aria-label="Закрыть">X</button>
      )}
    </div>
  );
}

function FilePreview({ file, onRename, onDelete, onClose }: FileProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [busyShare, setBusyShare] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    setUrl(null); setText(null); setError(null); setImgFailed(false);
    setShareToken(file.public_token ?? null);
    let cancelled = false;
    const kind = kindFromMime(file.mime_type);

    filesApi.signedDownloadUrl(file.id)
      .then(async (signed) => {
        if (cancelled) return;
        setUrl(signed);
        if (kind === 'text') {
          try {
            const res = await fetch(signed);
            const body = await res.text();
            if (!cancelled) setText(body.slice(0, 4000));
          } catch (e) { if (!cancelled) setError((e as Error).message); }
        }
      })
      .catch((e) => !cancelled && setError((e as Error).message));

    return () => { cancelled = true; };
  }, [file.id, file.storage_path, file.mime_type, file.public_token]);

  const kind = kindFromMime(file.mime_type);
  const icons = iconForKind(kind);

  let body: React.ReactNode;
  if (error) body = <div style={{ color: 'var(--red)', fontSize: 10 }}>{error}</div>;
  else if (!url) body = <span style={{ fontSize: 10 }}>ЗАГРУЗКА…</span>;
  else if (kind === 'image') {
    body = imgFailed
      ? <Icon name={icons.preview} />
      : <img src={url} alt="" onError={() => setImgFailed(true)} />;
  }
  else if (kind === 'video') body = <video src={url} controls />;
  else if (kind === 'audio') body = <audio src={url} controls />;
  else if (kind === 'pdf') body = <iframe src={url} title={file.name} />;
  else if (kind === 'text') body = <pre>{text ?? '…'}</pre>;
  else body = <Icon name={icons.preview} />;

  const onDownload = async () => {
    try {
      const dlUrl = await filesApi.signedAttachmentUrl(file.id);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onShare = async () => {
    setBusyShare(true);
    try {
      const token = shareToken ?? (await filesApi.createShareLink(file.id));
      setShareToken(token);
      try {
        await navigator.clipboard.writeText(shareUrlFor(token));
        show('Ссылка скопирована', 'ok');
      } catch {
        show(shareUrlFor(token), 'info');
      }
    } catch (e) {
      show((e as Error).message, 'err');
    } finally {
      setBusyShare(false);
    }
  };

  const onUnshare = async () => {
    setBusyShare(true);
    try {
      await filesApi.revokeShareLink(file.id);
      setShareToken(null);
      show('Доступ отозван', 'ok');
    } catch (e) {
      show((e as Error).message, 'err');
    } finally {
      setBusyShare(false);
    }
  };

  return (
    <aside className="preview-pane">
      <PaneHeader onClose={onClose} />
      <div className="pp-body">
        {body}
        <div className="pp-meta">
          <span className="k">ИМЯ</span><span className="v">{file.name}</span>
          <span className="k">ТИП</span><span className="v">{file.mime_type}</span>
          <span className="k">ВИД</span><span className="v">{KIND_LABELS[kind] ?? kind}</span>
          <span className="k">РАЗМЕР</span><span className="v">{formatSize(file.size_bytes)}</span>
          <span className="k">СОЗДАН</span>
          <span className="v">{new Date(file.created_at).toLocaleString()}</span>
          <span className="k">ИЗМЕНЁН</span>
          <span className="v">{new Date(file.updated_at).toLocaleString()}</span>
          {shareToken && (
            <>
              <span className="k">ДОСТУП</span>
              <span className="v">публичная ссылка</span>
            </>
          )}
        </div>
      </div>
      <div className="pp-actions">
        <button className="btn-pixel" type="button" onClick={onDownload}>СКАЧАТЬ</button>
        <button className="btn-pixel" type="button" disabled={busyShare} onClick={onShare}>
          {shareToken ? 'СКОПИРОВАТЬ ССЫЛКУ' : 'ПОДЕЛИТЬСЯ'}
        </button>
        {shareToken && (
          <button className="btn-pixel ghost" type="button" disabled={busyShare} onClick={onUnshare}>
            ОТОЗВАТЬ
          </button>
        )}
        <button className="btn-pixel" type="button" onClick={onRename}>ПЕРЕИМЕНОВАТЬ</button>
        <button className="btn-pixel danger" type="button" onClick={onDelete}>УДАЛИТЬ</button>
      </div>
    </aside>
  );
}

function FolderPreview({ folder, onDownloadZip, onRename, onDelete, onClose }: FolderProps) {
  const [shareToken, setShareToken] = useState<string | null>(folder.public_token);
  const [busyShare, setBusyShare] = useState(false);
  const { show } = useToast();

  useEffect(() => { setShareToken(folder.public_token ?? null); }, [folder.public_token]);

  const onShare = async () => {
    setBusyShare(true);
    try {
      const token = shareToken ?? (await filesApi.createFolderShareLink(folder.id));
      setShareToken(token);
      try {
        await navigator.clipboard.writeText(shareUrlFor(token));
        show('Ссылка на папку скопирована', 'ok');
      } catch {
        show(shareUrlFor(token), 'info');
      }
    } catch (e) {
      show((e as Error).message, 'err');
    } finally {
      setBusyShare(false);
    }
  };

  const onUnshare = async () => {
    setBusyShare(true);
    try {
      await filesApi.revokeFolderShareLink(folder.id);
      setShareToken(null);
      show('Доступ отозван', 'ok');
    } catch (e) {
      show((e as Error).message, 'err');
    } finally {
      setBusyShare(false);
    }
  };

  return (
    <aside className="preview-pane">
      <PaneHeader onClose={onClose} />
      <div className="pp-body">
        <Icon name="big-folder" />
        <div className="pp-meta">
          <span className="k">ИМЯ</span><span className="v">{folder.name}</span>
          <span className="k">СОЗДАНА</span>
          <span className="v">{new Date(folder.created_at).toLocaleString()}</span>
          <span className="k">ИЗМЕНЕНА</span>
          <span className="v">{new Date(folder.updated_at).toLocaleString()}</span>
          {shareToken && (
            <>
              <span className="k">ДОСТУП</span>
              <span className="v">публичная ссылка</span>
            </>
          )}
        </div>
      </div>
      <div className="pp-actions">
        <button className="btn-pixel" type="button" onClick={onDownloadZip}>СКАЧАТЬ ZIP</button>
        <button className="btn-pixel" type="button" disabled={busyShare} onClick={onShare}>
          {shareToken ? 'СКОПИРОВАТЬ ССЫЛКУ' : 'ПОДЕЛИТЬСЯ'}
        </button>
        {shareToken && (
          <button className="btn-pixel ghost" type="button" disabled={busyShare} onClick={onUnshare}>
            ОТОЗВАТЬ
          </button>
        )}
        <button className="btn-pixel" type="button" onClick={onRename}>ПЕРЕИМЕНОВАТЬ</button>
        <button className="btn-pixel danger" type="button" onClick={onDelete}>УДАЛИТЬ</button>
      </div>
    </aside>
  );
}
