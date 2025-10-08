import React from 'react';
import type { User } from '../types/domain.ts';
import { AuthAPI } from '../services/endpoints.ts';

const AUTH_TOKEN_KEY = 'teamboard_token';
const AUTH_USER_KEY = 'teamboard_user';

function loadToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}
function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
function saveAuth(token: string, user: User) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {}
}
function clearAuth() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {}
}

export const AuthContext = React.createContext<{
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}>({ token: null, user: null, login: async () => {}, logout: () => {} });

export function useAuth() {
  return React.useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(loadToken());
  const [user, setUser] = React.useState<User | null>(loadUser());

  const login = React.useCallback(async (username: string, password: string) => {
    const res = await AuthAPI.login({ username, password });
    setToken(res.token);
    setUser(res.user);
    saveAuth(res.token, res.user);
  }, []);

  const logout = React.useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  React.useEffect(() => {
    const handler = () => logout();
    // @ts-ignore
    window.addEventListener('unauthorized', handler);
    return () => {
      // @ts-ignore
      window.removeEventListener('unauthorized', handler);
    };
  }, [logout]);

  const value = React.useMemo(() => ({ token, user, login, logout }), [token, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
