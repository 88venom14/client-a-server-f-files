import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { authApi } from '@/features/auth/useAuth';
import { useToast } from '@/components/ui/Toast';

const links = [
  { to: '/', icon: 'folder', label: 'МОИ ФАЙЛЫ' },
  { to: '/trash', icon: 'trash', label: 'КОРЗИНА' },
  { to: '/settings', icon: 'info', label: 'НАСТРОЙКИ' },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNavigate();
  const { show } = useToast();

  const signOut = async () => {
    await authApi.signOut();
    show('Вы вышли', 'ok');
    nav('/login');
  };

  return (
    <aside className="panel sidebar">
      <div className="panel-title">OZON Disk</div>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) => `tool ${isActive ? 'selected' : ''}`}
        >
          <Icon name={l.icon} />
          <span>{l.label}</span>
        </NavLink>
      ))}
      <button className="btn-pixel danger sign-out" type="button" onClick={signOut}>
        ВЫЙТИ
      </button>
    </aside>
  );
}
