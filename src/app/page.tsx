'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/store/auth-store';
import { usePracticeStore } from '@/store/practice-store';
import { PracticeForm } from '@/components/practice/practice-form';
import { CalendarView } from '@/components/training/calendar-view';
import { PracticeStatsChart } from '@/components/practice/practice-stats-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, LogOut, Sun, Target, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useEventPopup } from '@/hooks/use-event-popup';
import { usePersonalEventPopup } from '@/hooks/use-personal-event-popup';
import { EventCongratulationModal } from '@/components/events/event-congratulation-modal';
import { PersonalEventCongratulationModal } from '@/components/events/personal-event-congratulation-modal';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function Dashboard() {
  const { user, logout } = useAuthStore();
  const { eventsToShow, isOpen: isEventPopupOpen, handleClose: handleEventPopupClose } = useEventPopup(user?.id);
  const { eventsToShow: personalEventsToShow, isOpen: isPersonalEventPopupOpen, handleClose: handlePersonalEventPopupClose } = usePersonalEventPopup(user?.id);
  const {
    goal,
    selectedDate,
    setSelectedDate,
    fetchPracticeItems,
    fetchUserSettings,
    fetchLogsForDate,
    fetchTotalLight,
    totalLightInfo,
    isLoading,
  } = usePracticeStore();

  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasInitializedDate = useRef(false);

  // practice-form 으로 정확히 스크롤하는 함수
  const scrollToPracticeForm = useCallback(() => {
    const el = document.getElementById('practice-form');
    const header = document.querySelector('header');
    if (!el) return;
    const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 56;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const handleSaveComplete = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    
    // 모바일(아이폰)에서 키보드가 내려가는 애니메이션 및 부드러운 스크롤 중 
    // 중첩 실행 시 스크롤 위치 계산 오류가 발생하는 현상을 방지하기 위해 
    // 한 번만 약간의 딜레이(500ms)를 두고 스크롤합니다.
    setTimeout(() => scrollToPracticeForm(), 500);
  }, [scrollToPracticeForm]);

  useEffect(() => {
    sessionStorage.removeItem('justLoggedIn');
    const today = format(new Date(), 'yyyy-MM-dd');

    // Zustand persist에 남아 있을 수 있는 예전 날짜를 무시하고 오늘로 강제 초기화 (최초 1회만)
    if (!hasInitializedDate.current && selectedDate !== today) {
      setSelectedDate(today);
      hasInitializedDate.current = true;
      return; // setSelectedDate 내부에서 fetchLogsForDate(today)를 호출하므로 이후 로직은 다음 렌더링에서 수행됨
    }
    hasInitializedDate.current = true;

    // 모든 초기 데이터 fetch가 완료된 후 dataReady 를 true 로 설정
    Promise.all([
      fetchPracticeItems(),
      fetchUserSettings(),
      fetchLogsForDate(selectedDate),
      fetchTotalLight(),
    ]).finally(() => {
      setDataReady(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fetchPracticeItems, fetchUserSettings, fetchLogsForDate, fetchTotalLight, setSelectedDate]);

  // 데이터 로딩 완료 후 실천 현황 폼으로 자동 스크롤 (1회, 2패스)
  useEffect(() => {
    if (dataReady && !hasInitialScrolled) {
      // 1차: 레이아웃 초기 안정 후
      setTimeout(() => scrollToPracticeForm(), 300);
      // 2차: 차트/캘린더 등 비동기 렌더링 완료 후 보정
      setTimeout(() => scrollToPracticeForm(), 800);
      setHasInitialScrolled(true);
    }
  }, [dataReady, hasInitialScrolled, scrollToPracticeForm]);

  // 모바일 웹앱: 백그라운드에서 돌아오면 페이지 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        window.location.reload();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 관리자 접속 시 비밀번호 초기화 요청 알림
  useEffect(() => {
    if (user?.isAdmin && dataReady) {
      const checkPendingRequests = async () => {
        try {
          if (sessionStorage.getItem('adminCheckedRequests')) return;
          sessionStorage.setItem('adminCheckedRequests', 'true');

          const response = await api.getUsers();
          const usersList = response?.users || [];
          const pendingCount = usersList.filter((u: any) => u.resetRequested || u.accountLocked).length;
          
          if (pendingCount > 0) {
            toast.warning(`비밀번호 관리 요청이 ${pendingCount}건 있습니다.`, {
              description: '관리자 페이지에서 확인해주세요.',
              duration: 10000,
              action: {
                label: '확인하기',
                onClick: () => window.location.href = '/admin'
              }
            });
          }
        } catch (e) {
          console.error('Failed to check pending reset requests', e);
        }
      };
      
      checkPendingRequests();
    }
  }, [user?.isAdmin, dataReady]);

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    
    // 캘린더 라이브러리(react-day-picker)의 내부 포커스 복귀 로직에 의해
    // 스크롤이 다시 달력으로 당겨지는 현상 방지:
    // 1. 현재 포커스된 달력 버튼에서 포커스 해제
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 2. 렌더링이 완전히 끝난 후 스크롤되도록 지연 시간 확보
    setTimeout(() => scrollToPracticeForm(), 150);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-950 dark:to-slate-900">
      {/* 데이터 로딩 중 오버레이 스피너 */}
      {!dataReady && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-950 dark:to-slate-900 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
          <p className="text-sm text-muted-foreground font-medium">실천 현황을 불러오는 중...</p>
        </div>
      )}
      {/* 헤더 - 클릭 시 맨 위로 스크롤 */}
      <header
        className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b cursor-pointer"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-4xl relative">
          
          {/* 타이틀 영역 - 좌측 정렬 */}
          <div className="flex flex-col items-start">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground/80 mb-0.5">
              노원지원 80인 도장 달성을 위한
            </span>
            <div className="flex items-center gap-1">
              <h1 className="text-base sm:text-lg font-bold leading-none">
                1만 빛 <span className="inline-block text-yellow-500">☀️</span> 모으기 역사
              </h1>
            </div>
          </div>

          {/* 우측 버튼 영역 */}
          <div className="flex items-center gap-1 sm:gap-2">
            {user?.isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" title="관리자 페이지" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950">
                  <Shield className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Link href="/settings">
              <Button variant="ghost" size="icon" title="설정">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </Button>
            {user?.name && (
              <span className="text-xs sm:text-sm font-medium text-foreground ml-1 whitespace-nowrap">
                {user.name}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* 사용자 목표 */}
        {goal && (
          <div className="flex flex-row items-center gap-3 w-full mb-2">
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-3xl sm:text-4xl drop-shadow-sm">☀️</span>
              <div className="text-sm font-bold leading-tight">
                나의<br />목표
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded-sm py-3 px-4 flex items-center justify-center">
              <span className="font-bold text-base">
                {goal.dailyLightGoal > 0 && `1일: ${goal.dailyLightGoal}빛`}
                {goal.dailyLightGoal > 0 && goal.totalLightGoal > 0 && ', '}
                {goal.totalLightGoal > 0 && `누적: ${goal.totalLightGoal.toLocaleString()}빛`}
                {goal.dailyLightGoal === 0 && goal.totalLightGoal === 0 && '설정에서 1일 목표를 설정해보세요!'}
              </span>
            </div>
          </div>
        )}

        {/* 캘린더 */}
        <div>
          <CalendarView
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date()}
            refreshKey={refreshKey}
          />
        </div>

        {/* 통계 */}
        <div>
          <PracticeStatsChart refreshKey={refreshKey} />
        </div>

        {/* 실천 현황 폼 (제일 아래로 이동) */}
        <PracticeForm onSave={handleSaveComplete} userId={user?.id} userName={user?.name} />
      </div>

      {/* 이벤트 당첨 팝업 */}
      {isEventPopupOpen && user?.id && (
        <EventCongratulationModal
          events={eventsToShow}
          currentUserId={user.id}
          onClose={handleEventPopupClose}
        />
      )}

      {/* 개인 이벤트 달성 팝업 */}
      {isPersonalEventPopupOpen && user?.id && (
        <PersonalEventCongratulationModal
          events={personalEventsToShow}
          currentUserId={user.id}
          onClose={handlePersonalEventPopupClose}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
