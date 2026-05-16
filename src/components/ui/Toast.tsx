import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Tone = 'ok' | 'err' | 'info';
interface Toast { msg: string; tone: Tone; key: number }

interface ToastCtx { show: (msg: string, tone?: Tone) => void }

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback((msg: string, tone: Tone = 'info') => {
    if (timer.current) window.clearTimeout(timer.current);
    setToast({ msg, tone, key: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div
          key={toast.key}
          className={`toast show ${toast.tone === 'ok' ? 'ok' : toast.tone === 'err' ? 'err' : ''}`}
        >
          {toast.msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
