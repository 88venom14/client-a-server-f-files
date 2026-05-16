import { useEffect } from 'react';
import { create } from 'zustand';
import { api, tokenStore, ApiError } from '@/lib/api';
import type { User } from '@/types';

export interface Session {
  user: User;
  token: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  setLoading: (b: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  setAuth: (user, token) => {
    if (token) tokenStore.set(token);
    else tokenStore.clear();
    set({
      user,
      session: user && token ? { user, token } : null,
    });
  },
  setLoading: (b) => set({ loading: b }),
}));

let initialized = false;

export function useAuth() {
  const state = useAuthStore();

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const token = tokenStore.get();
    if (!token) {
      useAuthStore.getState().setLoading(false);
      return;
    }
    api
      .get<User>('/api/auth/me')
      .then((u) => useAuthStore.getState().setAuth(u, token))
      .catch(() => useAuthStore.getState().setAuth(null, null))
      .finally(() => useAuthStore.getState().setLoading(false));
  }, []);

  return state;
}

interface AuthResp { user: User; token: string }

function toError(e: unknown): Error {
  if (e instanceof ApiError) return new Error(e.message);
  if (e instanceof Error) return e;
  return new Error('Неизвестная ошибка');
}

export const authApi = {
  async signIn(email: string, password: string) {
    try {
      const r = await api.post<AuthResp>('/api/auth/signin', { email, password });
      useAuthStore.getState().setAuth(r.user, r.token);
      return { data: { session: { user: r.user, token: r.token }, user: r.user }, error: null };
    } catch (e) {
      return { data: { session: null, user: null }, error: toError(e) };
    }
  },

  async signUp(email: string, password: string) {
    try {
      const r = await api.post<AuthResp>('/api/auth/signup', { email, password });
      useAuthStore.getState().setAuth(r.user, r.token);
      return { data: { session: { user: r.user, token: r.token }, user: r.user }, error: null };
    } catch (e) {
      return { data: { session: null, user: null }, error: toError(e) };
    }
  },

  async signOut() {
    try { await api.post('/api/auth/signout'); } catch { /* ignore */ }
    useAuthStore.getState().setAuth(null, null);
    return { error: null };
  },

  async resetPassword(_email: string) {
    return { error: new Error('Сброс пароля пока не поддерживается') };
  },
};
