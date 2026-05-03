'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await login(email, password);

      // 로그인 후 사용자 정보 확인
      const currentUser = useAuthStore.getState().user;

      // 임시 비밀번호 사용자인 경우 비밀번호 변경 페이지로 리다이렉트
      if (currentUser?.requiresPasswordChange) {
        toast.warning('임시 비밀번호로 로그인하셨습니다. 비밀번호를 변경해주세요.');
        router.push('/settings?force=true#change-password');
      } else {
        toast.success('로그인되었습니다.');
        sessionStorage.setItem('justLoggedIn', 'true');
        router.push('/');
      }
    } catch (error: any) {
      toast.error(error || '로그인에 실패했습니다.');
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email) {
      toast.error('비밀번호를 초기화할 아이디(전화번호)를 먼저 입력해주세요.');
      return;
    }

    setShowResetDialog(true);
  };

  const confirmForgotPassword = async () => {
    setShowResetDialog(false);
    try {
      await api.requestPasswordReset(email);
      toast.success('관리자에게 비밀번호 초기화가 요청되었습니다.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '요청에 실패했습니다.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-2xl font-bold text-center">로그인</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">아이디</Label>
            <Input
              id="email"
              type="tel"
              placeholder="등록한 전화번호를 숫자만 입력하세요"
              value={email}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setEmail(value);
              }}
              disabled={isLoading}
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-primary hover:underline"
            >
              비밀번호 초기화 요청
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          계정이 없으신가요?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            회원가입
          </Link>
        </div>
      </CardContent>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 초기화 요청</DialogTitle>
            <DialogDescription>
              관리자에게 비밀번호 초기화를 요청하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              취소
            </Button>
            <Button onClick={confirmForgotPassword}>
              요청하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
