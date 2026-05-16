import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

function RouteFallback() {
  return <div className="route-fallback" aria-busy="true" />;
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div className={`app-shell${menuOpen ? ' menu-open' : ''}`}>
      <Sidebar onNavigate={() => setMenuOpen(false)} />
      <div
        className="sidebar-backdrop"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <main className="app-main">
        <TopNav>
          <button
            className="mobile-menu-btn"
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Меню"
          >☰</button>
        </TopNav>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
