// ============================================================
// KitchenPulse Mobile — Authentication Store (Zustand + AsyncStorage)
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Organization, AuthResponse } from '../types';
import { api, setAuthToken } from '../api/client';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
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
  setHydrated: (isHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,

      setHydrated: (isHydrated: boolean) => set({ isHydrated }),

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
    }),
    {
      name: 'kitchenpulse_mobile_auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
        state?.setHydrated(true);
      },
    }
  )
);

