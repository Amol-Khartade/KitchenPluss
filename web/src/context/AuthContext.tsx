import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Organization, AuthResponse } from '../types/index.js';
import { authApi } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  hasAdminAccess: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  login: (data: { email: string; password: string }) => Promise<AuthResponse>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    organization_id?: string;
    organization_name?: string;
  }) => Promise<AuthResponse>;
  loginWithGoogle: (data: {
    credential?: string;
    email?: string;
    name?: string;
    picture?: string;
    googleId?: string;
    organization_id?: string;
    organization_name?: string;
    role?: string;
  }) => Promise<AuthResponse>;
  logout: () => void;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'signup') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'kitchenpulse_token';
const USER_KEY = 'kitchenpulse_user';
const ORG_KEY = 'kitchenpulse_org';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [organization, setOrganization] = useState<Organization | null>(() => {
    try {
      const stored = localStorage.getItem(ORG_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Verify stored session on mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { user: currentUser, organization: currentOrg } = await authApi.getMe();
        if (isMounted) {
          setUser(currentUser);
          setOrganization(currentOrg);
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
          localStorage.setItem(ORG_KEY, JSON.stringify(currentOrg));
        }
      } catch (err) {
        console.warn('Session verification failed or expired, clearing session:', err);
        if (isMounted) {
          setUser(null);
          setOrganization(null);
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(ORG_KEY);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthSuccess = (res: AuthResponse) => {
    setUser(res.user);
    setOrganization(res.organization);
    setToken(res.token);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    localStorage.setItem(ORG_KEY, JSON.stringify(res.organization));
    setIsAuthModalOpen(false);
  };

  const login = async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await authApi.login(data);
    handleAuthSuccess(res);
    return res;
  };

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    organization_id?: string;
    organization_name?: string;
  }): Promise<AuthResponse> => {
    const res = await authApi.register(data);
    handleAuthSuccess(res);
    return res;
  };

  const loginWithGoogle = async (data: {
    credential?: string;
    email?: string;
    name?: string;
    picture?: string;
    googleId?: string;
    organization_id?: string;
    organization_name?: string;
    role?: string;
  }): Promise<AuthResponse> => {
    const res = await authApi.loginWithGoogle(data);
    handleAuthSuccess(res);
    return res;
  };

  const logout = () => {
    setUser(null);
    setOrganization(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORG_KEY);
  };

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const isOwner = user?.role === 'Owner';
  const isAdmin = user?.role === 'Admin';
  const hasAdminAccess = isOwner || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        isOwner,
        isAdmin,
        hasAdminAccess,
        isAuthModalOpen,
        authModalMode,
        login,
        signup,
        loginWithGoogle,
        logout,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
