import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isAdmin?: boolean; // 서버에서 관리자 여부 확인
  requiresPasswordChange?: boolean; // 비밀번호 변경 필요 여부 (임시 비밀번호 사용 시)
  trainingGoal?: string; // 수련 목표
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  withdraw: () => Promise<void>;
  updateTrainingGoal: (goal: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.login(email, password);
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken || null,
            isAuthenticated: true,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', response.token);
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data?.message || '로그인에 실패했습니다.';
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          const response = await api.register(email, password, name);
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken || null,
            isAuthenticated: true,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', response.token);
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data?.message || '회원가입에 실패했습니다.';
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await api.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
          }
        }
      },

      changePassword: async (newPassword: string, currentPassword?: string) => {
        set({ isLoading: true });
        try {
          await api.changePassword(newPassword, currentPassword);
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data?.message || '비밀번호 변경에 실패했습니다.';
        }
      },

      withdraw: async () => {
        set({ isLoading: true });
        try {
          await api.withdraw();
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data?.message || '회원탈퇴에 실패했습니다.';
        }
        // Clear auth state regardless of API response since user is deleted
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth-storage');
        }
      },

      updateTrainingGoal: async (goal: string) => {
        set({ isLoading: true });
        try {
          await api.updateTrainingGoal(goal);
          const user = get().user;
          if (user) {
            set({ user: { ...user, trainingGoal: goal.trim() }, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data?.message || '목표 저장에 실패했습니다.';
        }
      },

      fetchCurrentUser: async () => {
        const token = get().token;
        if (!token) return;

        set({ isLoading: true });
        try {
          const user = await api.getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          // 토큰 만료 시 refresh 시도
          const refreshed = await get().refreshSession();
          if (!refreshed) {
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
            }
          }
        }
      },

      refreshSession: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) return false;

        try {
          const response = await api.refreshSession(refreshToken);
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken || null,
            isAuthenticated: true,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', response.token);
          }
          return true;
        } catch (error) {
          console.error('Session refresh failed:', error);
          return false;
        }
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
