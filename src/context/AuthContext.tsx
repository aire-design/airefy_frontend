'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { UserProfile } from '@/types';
import { getMe } from '@/lib/api';
import { getToken, removeToken, setToken } from '@/lib/auth';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (jwt: string, user: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const jwt = getToken();
    if (!jwt) {
      setLoading(false);
      return;
    }

    getMe(jwt)
      .then((me) => {
        setUser(me);
        setTokenState(jwt);
      })
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  // Auto-logout when any API call returns 401 (expired or invalid token)
  useEffect(() => {
    function onUnauthorized() {
      removeToken();
      setTokenState(null);
      setUser(null);
    }
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback((jwt: string, userData: UserProfile) => {
    setToken(jwt);
    setTokenState(jwt);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
