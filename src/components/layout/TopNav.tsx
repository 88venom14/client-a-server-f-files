import { useAuth } from '@/features/auth/useAuth';

export function TopNav({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <header className="app-topbar">
      <div className="brand">Файлы</div>
      <div className="topbar-right">
        {children}
        <span className="email">{user?.email}</span>
      </div>
    </header>
  );
}
