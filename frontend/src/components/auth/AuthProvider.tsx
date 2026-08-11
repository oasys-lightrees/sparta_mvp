'use client';

import { createContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/services/auth.api';
import {
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '@/lib/storage';
import type { User } from '@/types';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on first mount, then refresh from /me so a stored
  // user picks up any server-side changes (name, role). A failed refresh leaves
  // the cached user in place rather than logging them out on a network hiccup.
  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setLoading(false);
    if (!stored || !getToken()) return;
    let active = true;
    authApi
      .me()
      .then((fresh) => {
        if (!active) return;
        setStoredUser(fresh);
        setUser(fresh);
      })
      .catch(() => {
        /* keep the cached user */
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = (token: string, nextUser: User) => {
    setToken(token);
    setStoredUser(nextUser);
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    const { token, user: nextUser } = await authApi.login({ email, password });
    persist(token, nextUser);
    return nextUser;
  };

  // Register then immediately log in so the user lands authenticated.
  const register = async (name: string, email: string, password: string) => {
    await authApi.register({ name, email, password });
    return login(email, password);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
