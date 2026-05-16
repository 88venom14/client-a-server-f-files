import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/features/auth/useAuth';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { show } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await authApi.signUp(email, password);
    setBusy(false);
    if (error) { show(error.message, 'err'); return; }
    if (data.session) {
      show('Аккаунт создан', 'ok');
      nav('/');
    } else {
      const { error: signInErr } = await authApi.signIn(email, password);
      if (signInErr) {
        show('Аккаунт создан — проверьте почту', 'ok');
        nav('/login');
      } else {
        show('Добро пожаловать', 'ok');
        nav('/');
      }
    }
  };

  return (
    <AuthLayout title="РЕГИСТРАЦИЯ">
      <form onSubmit={submit} className="form-stack">
        <label className="form-label">EMAIL</label>
        <input className="rename-input" type="email" required maxLength={254}
          autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="form-label">ПАРОЛЬ</label>
        <input className="rename-input" type="password" required minLength={6} maxLength={128}
          autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-pixel" disabled={busy}>
          {busy ? '…' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
        </button>
        <div className="auth-links">
          <Link to="/login">УЖЕ ЕСТЬ АККАУНТ?</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
