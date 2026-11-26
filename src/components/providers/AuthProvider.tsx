'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/auth';
import { clearClientCache } from '@/lib/services/clipService';

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<SessionUser | null>;
  setUserDirect: (user: SessionUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'cliptrack_user_cache';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const setUserDirect = useCallback((newUser: SessionUser | null) => {
    setUser(newUser);
    setLoading(false);
    try {
      if (newUser) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  const refreshUser = useCallback(async (): Promise<SessionUser | null> => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUserDirect(data.user);
        return data.user;
      } else {
        setUserDirect(null);
        return null;
      }
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [setUserDirect]);

  useEffect(() => {
    // Hydrate instantly from sessionStorage so zero flicker occurs on route switch
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
        setLoading(false);
      }
    } catch {}

    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    setUserDirect(null);
    clearClientCache();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  }, [router, setUserDirect]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        logout,
        refreshUser,
        setUserDirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
