'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ChangePasswordForm() {
  const router = useRouter();
  const { changePassword, fetchCurrentUser, isLoading, user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const wasTemporaryPassword = user?.requiresPasswordChange || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 임시 비밀번호 사용자가 아닌 경우에만 현재 비밀번호 체크
    if (!wasTemporaryPassword && !currentPassword) {
      toast.error('현재 비밀번호를 입력해주세요.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error('새 비밀번호를 입력해주세요.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    // 임시 비밀번호 사용자가 아닌 경우에만 현재 비밀번호와 비교
    if (!wasTemporaryPassword && currentPassword === newPassword) {
      toast.error('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      return;
    }

    try {
      // 임시 비밀번호 사용자는 현재 비밀번호 없이 변경
      await changePassword(newPassword, wasTemporaryPassword ? undefined : currentPassword);
      toast.success('비밀번호가 성공적으로 변경되었습니다.');

      // 폼 초기화
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // 임시 비밀번호 사용자였다면 로그아웃 후 로그인 페이지로 리다이렉트
      if (wasTemporaryPassword) {
        setTimeout(async () => {
          toast.info('새 비밀번호로 다시 로그인해주세요.');
          const { logout } = useAuthStore.getState();
          await logout();
          router.push('/login');
        }, 1500);
      } else {
        // 일반 사용자는 사용자 정보 새로고침
        await fetchCurrentUser();
      }
    } catch (error: any) {
      toast.error(error || '비밀번호 변경에 실패했습니다.');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          <CardTitle>비밀번호 변경</CardTitle>
        </div>
        <CardDescription>
          {wasTemporaryPassword
            ? '새로운 비밀번호를 설정해주세요.'
            : '비밀번호를 변경하려면 현재 비밀번호를 입력해주세요.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!wasTemporaryPassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="현재 비밀번호 입력"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="새 비밀번호 입력 (6자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="새 비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
