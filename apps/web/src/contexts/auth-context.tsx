import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, restoreSession, tokenStorage } from '@/lib/api-client';
import type { AuthResponse, AuthUser, UserRole } from '@/lib/auth';
import { AuthContext } from './auth-context-value';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = tokenStorage.get()
      ? apiFetch<AuthUser>('/auth/me')
      : restoreSession().then((session) => session?.user ?? null);
    restore.then(setUser).catch(() => tokenStorage.clear()).finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback((session: AuthResponse) => {
    tokenStorage.set(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  const login = useCallback(async (email: string, password: string) => saveSession(await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })), [saveSession]);

  const register = useCallback(async (email: string, password: string, role: Exclude<UserRole, 'ADMIN'>, consent: { termsAccepted: true; privacyAccepted: true; majorityAgeConfirmed: true; marketingConsent: boolean }) => saveSession(await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, role, ...consent }),
  })), [saveSession]);

  const logout = useCallback(async () => {
    try { await apiFetch<void>('/auth/logout', { method: 'POST' }); } finally { tokenStorage.clear(); setUser(null); }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
