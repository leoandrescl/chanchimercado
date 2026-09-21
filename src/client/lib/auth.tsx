import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

interface AuthState {
  authed: boolean;
  loading: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setAuthed(false);
    window.addEventListener('cm:unauthorized', handler);
    return () => window.removeEventListener('cm:unauthorized', handler);
  }, []);

  const login = async (pin: string) => {
    await api.post('/api/auth/login', { pin });
    setAuthed(true);
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setAuthed(false);
  };

  return <AuthContext.Provider value={{ authed, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
