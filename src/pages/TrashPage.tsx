import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '@/features/files/filesApi';
import { formatSize } from '@/features/files/fileKind';
import { FileListSkeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

export function TrashPage() {
  const qc = useQueryClient();
  const { show } = useToast();
  const trash = useQuery({
    queryKey: ['files', 'trash'],
    queryFn: () => filesApi.listTrash(),
  });

  const restore = useMutation({
    mutationFn: (id: string) => filesApi.restoreFile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      show('Восстановлено', 'ok');
    },
    onError: (e) => show((e as Error).message, 'err'),
  });

  const purge = useMutation({
    mutationFn: (p: { id: string; path: string }) => filesApi.purgeFile(p.id, p.path),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      show('Удалено навсегда', 'ok');
    },
    onError: (e) => show((e as Error).message, 'err'),
  });

  return (
    <div className="explorer" style={{ gridTemplateColumns: '1fr' }}>
      <div className="breadcrumbs">
        <span>КОРЗИНА</span>
      </div>
      <div className="explorer-body" style={{ gridColumn: '1 / -1' }}>
        {trash.isLoading && <FileListSkeleton />}
        {trash.data && trash.data.length === 0 && (
          <div className="empty-state">
            <Icon name="big-bin" />
            <p style={{ fontSize: 10, letterSpacing: 1.5 }}>КОРЗИНА ПУСТА</p>
          </div>
        )}
        {trash.data && trash.data.length > 0 && (
          <div className="files">
            {trash.data.map((f) => (
              <div key={f.id} className="row" style={{ gridTemplateColumns: '22px 1fr 80px 90px auto auto' }}>
                <Icon name="file-bin" />
                <span className="name">{f.name}</span>
                <span className="size">{formatSize(f.size_bytes)}</span>
                <span className="date">
                  {f.deleted_at ? new Date(f.deleted_at).toLocaleDateString() : ''}
                </span>
                <button
                  className="btn-pixel ghost"
                  type="button"
                  onClick={() => restore.mutate(f.id)}
                >ВОССТАНОВИТЬ</button>
                <button
                  className="btn-pixel danger"
                  type="button"
                  onClick={() => {
                    if (confirm(`Удалить навсегда: ${f.name}?`)) {
                      purge.mutate({ id: f.id, path: f.storage_path });
                    }
                  }}
                >УДАЛИТЬ</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
