'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchCurrentUser, token } = useAuthStore();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 초기화 대기 (zustand persist가 로딩될 때까지)
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (!token) {
      router.push('/login');
      return;
    }

    if (!isAuthenticated && !isLoading) {
      fetchCurrentUser();
    }
  }, [isInitialized, token, isAuthenticated, isLoading, fetchCurrentUser, router]);

  // 초기 로딩 중이거나 인증 확인 중
  if (!isInitialized || isLoading || (!isAuthenticated && token)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 토큰이 없으면 로그인 페이지로 (라우팅은 useEffect에서 처리)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
