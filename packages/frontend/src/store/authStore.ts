import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest, readableError, unwrap } from '../lib/api';
import { disconnectSocket } from '../lib/socket';
import type { User } from '../types';

type AuthResponse = { token: string; user: User };

type AuthState = {
  token: string | null;
  user: User | null;
  status: 'checking' | 'authenticated' | 'anonymous';
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (handle: string, password: string) => Promise<void>;
  register: (handle: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

async function authenticate(
  path: '/auth/login' | '/auth/register',
  handle: string,
  password: string,
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse | { data: AuthResponse }>(path, {
    method: 'POST',
    body: { handle: handle.trim(), password },
  });
  return unwrap(response);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      status: 'checking',
      error: null,
      bootstrap: async () => {
        const { token } = get();
        if (!token) {
          set({ status: 'anonymous', user: null });
          return;
        }
        try {
          const response = await apiRequest<{ user: User } | { data: { user: User } }>('/auth/me', {
            token,
          });
          const data = unwrap(response);
          set({ user: data.user, status: 'authenticated', error: null });
        } catch {
          disconnectSocket();
          set({ token: null, user: null, status: 'anonymous' });
        }
      },
      login: async (handle, password) => {
        set({ status: 'checking', error: null });
        try {
          const result = await authenticate('/auth/login', handle, password);
          set({ ...result, status: 'authenticated' });
        } catch (error) {
          set({ status: 'anonymous', error: readableError(error) });
          throw error;
        }
      },
      register: async (handle, password) => {
        set({ status: 'checking', error: null });
        try {
          const result = await authenticate('/auth/register', handle, password);
          set({ ...result, status: 'authenticated' });
        } catch (error) {
          set({ status: 'anonymous', error: readableError(error) });
          throw error;
        }
      },
      logout: () => {
        disconnectSocket();
        set({ token: null, user: null, status: 'anonymous', error: null });
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'playstead-auth',
      partialize: ({ token, user }) => ({ token, user }),
    },
  ),
);
