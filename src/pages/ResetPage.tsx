import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/features/auth/useAuth';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function ResetPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await authApi.resetPassword(email);
    setBusy(false);
    if (error) show(error.message, 'err');
    else show('Письмо отправлено', 'ok');
  };

  return (
    <AuthLayout title="СБРОС ПАРОЛЯ">
      <form onSubmit={submit} className="form-stack">
        <label className="form-label">EMAIL</label>
        <input className="rename-input" type="email" required maxLength={254}
          autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-pixel" disabled={busy}>
          {busy ? '…' : 'ОТПРАВИТЬ ССЫЛКУ'}
        </button>
        <div className="auth-links">
          <Link to="/login">НАЗАД</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
