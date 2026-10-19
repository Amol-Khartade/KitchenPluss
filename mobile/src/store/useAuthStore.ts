// ============================================================
// KitchenPulse Mobile — Authentication Store (Zustand + MMKV)
// High-performance synchronous C++ storage with web fallback
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import { createMMKV, MMKV } from 'react-native-mmkv';
import { User, Organization, AuthResponse } from '../types';
import { api, setAuthToken } from '../api/client';

let mmkvInstance: MMKV | null = null;
if (Platform.OS !== 'web') {
  try {
    mmkvInstance = createMMKV({ id: 'kitchenpulse-auth-storage' });
  } catch (err) {
    console.warn('[useAuthStore] MMKV native initialization fallback:', err);
  }
}

export const mmkvStateStorage: StateStorage = {
  setItem: (name: string, value: string) => {
    if (mmkvInstance) {
      mmkvInstance.set(name, value);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(name, value);
    }
  },
  getItem: (name: string) => {
    if (mmkvInstance) {
      return mmkvInstance.getString(name) ?? null;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(name);
    }
    return null;
  },
  removeItem: (name: string) => {
    if (mmkvInstance) {
      mmkvInstance.remove(name);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(name);
    }
  },
};

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
      isHydrated: true, // MMKV is synchronous; ready on initial render

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
      storage: createJSONStorage(() => mmkvStateStorage),
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


