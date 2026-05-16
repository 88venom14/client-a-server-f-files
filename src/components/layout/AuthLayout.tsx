import type { ReactNode } from 'react';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth-screen">
      <div className="panel auth-card">
        <h1 className="panel-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
