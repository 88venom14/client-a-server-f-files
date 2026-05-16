import { useAuth } from '@/features/auth/useAuth';

export function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="settings-page">
      <h1 className="panel-title">НАСТРОЙКИ</h1>
      <div className="kv-grid">
        <div className="k">EMAIL</div>
        <div className="v mono">{user?.email}</div>
        <div className="k">ID ПОЛЬЗОВАТЕЛЯ</div>
        <div className="v mono">{user?.id}</div>
        <div className="k">СОЗДАН</div>
        <div className="v mono">
          {user?.created_at ? new Date(user.created_at).toLocaleString() : '—'}
        </div>
      </div>
    </div>
  );
}
