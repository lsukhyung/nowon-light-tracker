'use client';

import { usePracticeStore } from '@/store/practice-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Sun, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Event } from '@/types/training';
import { EventCongratulationModal } from '@/components/events/event-congratulation-modal';

export function PracticeForm({ onSave, userId, userName }: { onSave?: () => void; userId?: string; userName?: string }) {
  const {
    selectedDate,
    goal,
    totalLightInfo,
    savedTodayLight,
    getActivePracticeItems,
    getLogForItem,
    updateCount,
    saveBatch,
    isLoading,
  } = usePracticeStore();

  const [isSaving, setIsSaving] = useState(false);
  const [newWinEvents, setNewWinEvents] = useState<Event[]>([]);
  const [showWinModal, setShowWinModal] = useState(false);

  const activeItems = getActivePracticeItems();
  const todayLight = parseFloat(
    activeItems.reduce((sum, item) => {
      const log = getLogForItem(item.id);
      return sum + (log?.light || 0);
    }, 0).toFixed(2)
  );

  const deltaLight = parseFloat((todayLight - savedTodayLight).toFixed(2));

  const dailyGoal = goal?.dailyLightGoal || 0;
  const totalGoal = goal?.totalLightGoal || 0;

  const displayMyTotalLight = parseFloat(((totalLightInfo?.myTotalLight || 0) + deltaLight).toFixed(2));
  const displayTodayTotalOrg = parseFloat(((totalLightInfo?.todayTotalLight || 0) + deltaLight).toFixed(2));
  const displayAllTimeTotal = parseFloat(((totalLightInfo?.allTimeTotalLight || 0) + deltaLight).toFixed(2));

  const dailyAchievementRate = dailyGoal > 0
    ? Math.round((todayLight / dailyGoal) * 100)
    : 0;
  const totalAchievementRate = totalGoal > 0
    ? Math.round((displayMyTotalLight / totalGoal) * 100)
    : 0;

  const handleIncrement = (practiceItemId: string, lightPerUnit: number) => {
    const log = getLogForItem(practiceItemId);
    const currentCount = log?.count || 0;
    updateCount(practiceItemId, currentCount + 1, lightPerUnit);
  };

  const handleDecrement = (practiceItemId: string, lightPerUnit: number) => {
    const log = getLogForItem(practiceItemId);
    const currentCount = log?.count || 0;
    if (currentCount <= 0) return;
    updateCount(practiceItemId, currentCount - 1, lightPerUnit);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveBatch();
      toast.success('실천 기록이 저장되었습니다.');
      onSave?.();

      // 저장 후 이벤트 당첨 취대츠 (userId가 있을 때만)
      if (userId) {
        try {
          // 종로지원 전체 누적 빛 기준으로 이벤트 달성 여부 판별
          const result = await api.checkEventWin(displayAllTimeTotal, userName || '');
          if (result.newWins && result.newWins.length > 0) {
            setNewWinEvents(result.newWins);
            setShowWinModal(true);
          }
        } catch {
          // 이벤트 실패는 무시
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    const lines = [
      `🌻 나의 빛 밝히기 일일 집계 (${formattedDate})`,
      '',
    ];

    activeItems.forEach(item => {
      const log = getLogForItem(item.id);
      if (log && log.count > 0) {
        lines.push(`☀️ ${item.name} : ${log.count}회 ${log.light}빛`);
      }
    });

    lines.push('');
    lines.push(`☀️ 오늘 나의 빛: ${todayLight}${dailyGoal > 0 ? ` (목표대비 ${dailyAchievementRate}%)` : ''}`);
    lines.push(`☀️ 누적 나의 빛: ${displayMyTotalLight}${totalGoal > 0 ? ` (목표대비 ${totalAchievementRate}%)` : ''}`);
    lines.push(`☀️ 오늘 종로지원의 빛: ${displayTodayTotalOrg}`);
    lines.push(`☀️ 누적 종로지원의 빛: ${displayAllTimeTotal.toLocaleString()}`);

    const text = lines.join('\n');

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 모바일 인앱 브라우저(카톡 등) 호환성을 위한 텍스트 에어리어 방식 Fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (error) {
          throw new Error('Fallback copy failed');
        } finally {
          textArea.remove();
        }
      }
      toast.success('일일 실천 내용이 클립보드에 복사되었습니다.');
    } catch (err) {
      toast.error('단말기 설정으로 인해 복사에 실패했습니다.');
    }
  };

  const formattedDate = (() => {
    try {
      return format(new Date(selectedDate), 'yyyy.MM.dd(EEE)', { locale: ko });
    } catch {
      return selectedDate;
    }
  })();

  if (activeItems.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <Sun className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>설정 페이지에서 실천과제를 선택해주세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card id="practice-form" className="scroll-mt-20">
        <CardHeader className="pb-0 mb-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sun className="w-5 h-5 text-yellow-500" />
            나의 빛 밝히기 실천 현황({formattedDate})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0 pb-6">
        {/* 일일 집계 (공유용) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 mb-4 shadow-sm -mt-3">
          <table className="w-full text-[13px] sm:text-sm mb-3">
            <thead>
              <tr className="border-b-[1.5px] border-slate-800 dark:border-slate-300">
                <th className="text-left pb-2.5 pt-1 font-bold">실천활동</th>
                <th className="text-center pb-2.5 pt-1 font-bold w-12 sm:w-16">횟수</th>
                <th className="text-right pb-2.5 pt-1 font-bold w-12 sm:w-16">빛</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeItems.map(item => {
                const log = getLogForItem(item.id);
                if (!log || log.count === 0) return null;
                return (
                  <tr key={item.id} className="text-slate-600 dark:text-slate-300">
                    <td className="py-2 pr-2">
                      <span className="block leading-snug font-medium text-foreground">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight block">{item.description}</span>
                    </td>
                    <td className="py-2 text-center align-middle font-medium">{log.count}</td>
                    <td className="py-2 text-right align-middle font-bold text-slate-700 dark:text-slate-200">{log.light}</td>
                  </tr>
                );
              })}
              {activeItems.every(item => !getLogForItem(item.id) || getLogForItem(item.id)!.count === 0) && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground text-xs">
                    오늘 실천한 내용이 없습니다. 아래에서 + 버튼을 눌러 기록해주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="space-y-2 mt-1 text-[13px] sm:text-sm">
            <div className="flex justify-between font-extrabold text-slate-900 dark:text-white">
              <span>오늘 나의 빛</span>
              <span>
                {todayLight} {dailyGoal > 0 && <span className="font-bold text-xs sm:text-sm text-slate-500"> (목표대비 {dailyAchievementRate}%)</span>}
              </span>
            </div>
            <div className="flex justify-between font-extrabold text-slate-900 dark:text-white">
              <span>누적 나의 빛</span>
              <span>
                {displayMyTotalLight}
                {totalGoal > 0 && <span className="font-bold text-xs sm:text-sm text-slate-500"> (목표대비 {totalAchievementRate}%)</span>}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 font-extrabold text-slate-900 dark:text-white">
              <div className="flex justify-between">
                <span>오늘 종로지원의 빛</span>
                <span>{displayTodayTotalOrg}</span>
              </div>
              <div className="flex justify-between mt-1.5">
                <span>누적 종로지원의 빛</span>
                <span>{displayAllTimeTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 flex justify-center">
            <Button
              variant="default"
              className="bg-[#5c9ce6] hover:bg-[#4a7ebd] text-white rounded-full px-8 py-1.5 h-auto min-h-0 text-[13px] font-bold shadow-none leading-none flex items-center justify-center"
              onClick={handleShare}
            >
              공유
            </Button>
          </div>
        </div>

        {/* 실천과제 목록 */}
        <div className="border rounded-lg overflow-hidden mb-4">
          {/* 헤더 */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 bg-muted/50 border-b">
            <div className="px-3 pb-3 pt-2 text-sm font-medium text-muted-foreground">실천활동</div>
            <div className="px-3 pb-3 pt-2 text-sm font-medium text-muted-foreground text-center w-10">−</div>
            <div className="px-3 pb-3 pt-2 text-sm font-medium text-muted-foreground text-center w-16">횟수</div>
            <div className="px-3 pb-3 pt-2 text-sm font-medium text-muted-foreground text-center w-10">+</div>
          </div>

          {/* 과제 목록 */}
          {activeItems.map((item) => {
            const log = getLogForItem(item.id);
            const count = log?.count || 0;
            const light = log?.light || 0;

            return (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-0 border-b last:border-b-0 items-center hover:bg-muted/20 transition-colors"
              >
                <div className="px-3 py-3">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  {count > 0 && (
                    <p className="text-xs text-yellow-600 font-semibold mt-0.5">☀️ {light}빛</p>
                  )}
                </div>
                <button
                  onClick={() => handleDecrement(item.id, item.lightPerUnit)}
                  disabled={count === 0}
                  className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={`${item.name} 횟수 감소`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-16 text-center">
                  <span className="text-lg font-bold">{count}</span>
                </div>
                <button
                  onClick={() => handleIncrement(item.id, item.lightPerUnit)}
                  className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-md transition-colors"
                  aria-label={`${item.name} 횟수 증가`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 저장 버튼 */}
        <Button
          onClick={handleSave}
          className="w-full"
          size="lg"
          disabled={isSaving || isLoading}
        >
          {isSaving || isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              저장하기
            </>
          )}
        </Button>
        </CardContent>
      </Card>

      {/* 실천 저장 시 새로 당첨된 이벤트 팝업 */}
      {showWinModal && userId && (
        <EventCongratulationModal
          events={newWinEvents}
          currentUserId={userId}
          onClose={() => setShowWinModal(false)}
        />
      )}
    </>
  );
}
