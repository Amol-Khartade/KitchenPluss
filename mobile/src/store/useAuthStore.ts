// ============================================================
// KitchenPulse Mobile — Authentication Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { User, Organization, AuthResponse } from '../types';
import { api, setAuthToken } from '../api/client';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, organization: Organization, token: string) => void;
  logout: () => void;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    organization_id?: string;
    organization_name?: string;
  }) => Promise<AuthResponse>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  setAuth: (user: User, organization: Organization, token: string) => {
    setAuthToken(token);
    set({
      user,
      organization,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    setAuthToken(null);
    set({
      user: null,
      organization: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await api.auth.login({ email, password });
      setAuthToken(res.token);
      set({
        user: res.user,
        organization: res.organization,
        token: res.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return res;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.auth.register(data);
      setAuthToken(res.token);
      set({
        user: res.user,
        organization: res.organization,
        token: res.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return res;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
}));
