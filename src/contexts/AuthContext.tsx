'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { AuthSession } from '@/types';
import { auth, tokenUtils } from '@/lib/auth';

interface AuthContextType extends AuthSession {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    token: null,
    isLoading: true,
    error: null,
  });

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = tokenUtils.getToken();
      if (token) {
        try {
          const response = await auth.getSession();
          if (response.success) {
            setSession({
              user: response.data,
              token,
              isLoading: false,
              error: null,
            });
          } else {
            tokenUtils.removeToken();
            setSession({ user: null, token: null, isLoading: false, error: null });
          }
        } catch {
          tokenUtils.removeToken();
          setSession({ user: null, token: null, isLoading: false, error: null });
        }
      } else {
        setSession(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setSession(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await auth.login(email, password);
      if (response.success) {
        tokenUtils.setToken(response.data.token);
        setSession({
          user: response.data.user,
          token: response.data.token,
          isLoading: false,
          error: null,
        });
      } else {
        const message = response.error || 'Login failed';
        setSession(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw new Error(message);
      }
    } catch (error) {
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setSession(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await auth.signup(email, password, name);
      if (response.success) {
        tokenUtils.setToken(response.data.token);
        setSession({
          user: response.data.user,
          token: response.data.token,
          isLoading: false,
          error: null,
        });
      } else {
        const message = response.error || 'Signup failed';
        setSession(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw new Error(message);
      }
    } catch (error) {
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Signup failed',
      }));
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenUtils.removeToken();
      setSession({ user: null, token: null, isLoading: false, error: null });
    }
  };

  const resetPassword = async (email: string) => {
    setSession(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await auth.resetPassword(email);
      if (response.success) {
        setSession(prev => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
      } else {
        setSession(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Reset failed',
        }));
      }
    } catch (error) {
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Reset failed',
      }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...session, login, signup, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
