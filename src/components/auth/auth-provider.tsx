'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // 먼저 현재 토큰으로 사용자 정보 가져오기 시도
          await fetchCurrentUser();
        } catch (error) {
          // 실패 시 refresh token으로 세션 갱신 시도
          if (refreshToken) {
            try {
              await refreshSession();
            } catch (refreshError) {
              console.error('Session refresh failed:', refreshError);
            }
          }
        }
      }
      setIsInitializing(false);
    };

    initAuth();
  }, [token, refreshToken, fetchCurrentUser, refreshSession]);

  // 초기화 중이면 로딩 표시
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
