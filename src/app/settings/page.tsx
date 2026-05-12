'use client';

import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/store/auth-store';
import { usePracticeStore } from '@/store/practice-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  User, Phone, Calendar, ArrowLeft, AlertTriangle, Target, Plus, Trash2, Sun,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

function SettingsPage() {
  const { user } = useAuthStore();
  const {
    practiceItems,
    userSettings,
    goal,
    fetchPracticeItems,
    fetchUserSettings,
    saveUserSettings,
    createPracticeItem,
    deletePracticeItem,
  } = usePracticeStore();

  const searchParams = useSearchParams();
  const forceChange = searchParams.get('force') === 'true';
  const requiresPasswordChange = user?.requiresPasswordChange || false;

  // 목표
  const [dailyGoal, setDailyGoal] = useState<string>('');
  // 선택된 과제 IDSet
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 추가과제 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemLight, setNewItemLight] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchPracticeItems(), fetchUserSettings()]);
  }, [fetchPracticeItems, fetchUserSettings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // goal 로드 시 state 동기화
  useEffect(() => {
    if (goal) {
      setDailyGoal(goal.dailyLightGoal > 0 ? String(goal.dailyLightGoal) : '');
    }
  }, [goal]);

  // userSettings 로드 시 선택 ID 동기화
  useEffect(() => {
    const activeIds = new Set(
      userSettings.filter(s => s.isActive).map(s => s.practiceItemId)
    );
    setSelectedIds(activeIds);
  }, [userSettings]);

  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    const daily = parseFloat(dailyGoal);
    if (dailyGoal && isNaN(daily)) {
      toast.error('1일 목표 빛은 숫자로 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await saveUserSettings({
        practiceItemIds: [...selectedIds],
        dailyLightGoal: daily || 0,
        totalLightGoal: 0,
      });
      toast.success('설정이 저장되었습니다.');
    } catch (error: any) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast.error('과제명을 입력해주세요.');
      return;
    }
    const lightVal = parseFloat(newItemLight);
    if (isNaN(lightVal) || lightVal <= 0) {
      toast.error('빛은 0보다 큰 숫자로 입력해주세요.');
      return;
    }
    setIsAddingItem(true);
    try {
      await createPracticeItem({
        name: newItemName.trim(),
        description: newItemDescription.trim() || undefined,
        lightPerUnit: lightVal,
      });
      setShowAddModal(false);
      setNewItemName('');
      setNewItemDescription('');
      setNewItemLight('');
      toast.success('실천과제가 선택된 상태로 추가되었습니다.');
    } catch (error: any) {
      toast.error('과제 추가에 실패했습니다.');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('실천과제를 삭제하면 실천내용도 같이 삭제됩니다. 삭제하시겠습니까?')) {
      return;
    }
    try {
      await deletePracticeItem(id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('과제가 삭제되었습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await useAuthStore.getState().withdraw();
      toast.success('회원탈퇴가 완료되었습니다.');
      window.location.href = '/login';
    } catch (error: any) {
      toast.error(error || '회원탈퇴에 실패했습니다.');
      setIsWithdrawing(false);
      setShowWithdrawDialog(false);
    }
  };

  // 기본과제 / 추가과제 분리
  const defaultItems = practiceItems.filter(item => item.isDefault);
  const customItems = practiceItems.filter(item => !item.isDefault);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          {!requiresPasswordChange && !forceChange && (
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <h1 className="text-3xl font-bold">설정</h1>
        </div>

        {requiresPasswordChange && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>비밀번호 변경 필요</AlertTitle>
            <AlertDescription>
              임시 비밀번호로 로그인하셨습니다. 보안을 위해 비밀번호를 변경해주세요.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* ⑫ 계정정보 */}
          <Card>
            <CardHeader>
              <CardTitle>계정정보</CardTitle>
              <CardDescription>현재 로그인된 계정 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">이름</p>
                  <p className="font-medium">{user?.name || '이름 없음'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">전화번호</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
              {user?.createdAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">가입일</p>
                    <p className="font-medium">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ⑬ 나의 목표 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                나의 목표
              </CardTitle>
              <CardDescription>
                1일 목표 빛을 설정하세요. 메인 화면에 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2">
                  <Label htmlFor="daily-goal" className="whitespace-nowrap">1일</Label>
                  <Input
                    id="daily-goal"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={dailyGoal}
                    onChange={e => setDailyGoal(e.target.value)}
                    placeholder="0"
                    className="w-28"
                  />
                  <span className="text-sm font-medium">빛</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ⑭ 실천과제 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                나의 빛 밝히기 실천 과제 설정
              </CardTitle>
              <CardDescription>
                1회 빛을 밝히기 위해 실천할 과제를 선택하세요. 선택한 과제만 메인화면에 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 기본 과제 */}
              <div className="border rounded-lg overflow-hidden">
                {defaultItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        {item.name}
                        <span className="text-yellow-600 text-xs font-semibold">☀️ {item.lightPerUnit}빛</span>
                      </p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => handleToggleItem(item.id)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* 추가 과제 */}
              {customItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  {customItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium flex items-center gap-1">
                          {item.name}
                          <span className="text-yellow-600 text-xs font-semibold">☀️ {item.lightPerUnit}빛</span>
                        </p>
                        <p className="text-sm text-muted-foreground">{item.description || `1회 ${item.lightPerUnit}빛`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleToggleItem(item.id)}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ⑮ 실천과제 추가 버튼 */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="w-4 h-4" />
                실천과제 추가
              </Button>
            </CardContent>
          </Card>

          {/* 저장 버튼 */}
          <Button onClick={handleSave} className="w-full" size="lg" disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>

          {/* 비밀번호 변경 */}
          <div id="change-password" className="scroll-mt-8">
            <ChangePasswordForm />
          </div>

          {/* ⑯ 회원탈퇴 */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">회원탈퇴</CardTitle>
              <CardDescription>
                회원탈퇴 시 모든 데이터(수련 기록, 실천 기록, 개인 이벤트 등)가 삭제되며 복구할 수 없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowWithdrawDialog(true)}
                className="w-full sm:w-auto"
              >
                회원탈퇴
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ⑯ 회원탈퇴 확인 모달 */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>회원탈퇴 확인</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              정말로 탈퇴하시겠습니까? 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>취소</Button>
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? '처리 중...' : '탈퇴하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ⑮ 실천과제 추가 모달 */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>실천과제 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>실천 과제 명</Label>
              <Input
                placeholder="실천 과제명을 입력하세요"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>실천 기준</Label>
              <Input
                placeholder="횟수나 시간 등 1회 소양 기준을 입력하세요"
                value={newItemDescription}
                onChange={e => setNewItemDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>1회당 빛</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0.1"
                step="any"
                placeholder="예: 1"
                value={newItemLight}
                onChange={e => setNewItemLight(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>취소</Button>
            <Button onClick={handleAddItem} disabled={isAddingItem}>
              {isAddingItem ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Settings() {
  return (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  );
}
