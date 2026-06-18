'use client';

import { createContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/services/auth.api';
import {
  clearAuth,
  getStoredUser,
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

  // Hydrate from localStorage on first mount.
  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
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
