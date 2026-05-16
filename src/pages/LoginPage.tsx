import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@/features/auth/useAuth';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname: string } } };
  const { show } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await authApi.signIn(email, password);
    setBusy(false);
    if (error) { show(error.message, 'err'); return; }
    show('С возвращением', 'ok');
    nav(loc.state?.from?.pathname ?? '/');
  };

  return (
    <AuthLayout title="ВХОД">
      <form onSubmit={submit} className="form-stack">
        <label className="form-label">EMAIL</label>
        <input className="rename-input" type="email" required maxLength={254}
          autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="form-label">ПАРОЛЬ</label>
        <input className="rename-input" type="password" required minLength={6} maxLength={128}
          autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-pixel" disabled={busy}>
          {busy ? '…' : 'ВОЙТИ'}
        </button>
        <div className="auth-links">
          <Link to="/register">СОЗДАТЬ АККАУНТ</Link>
          <Link to="/reset">ЗАБЫЛИ ПАРОЛЬ?</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
