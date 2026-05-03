'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Event } from '@/types/training';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { getUserTitle } from '@/lib/user-titles';

interface Props {
  events: Event[];
  currentUserId: string;
  onClose: () => void;
}

function getDismissedKey(userId: string, eventId: string) {
  return `event_dismissed_${userId}_${eventId}`;
}

export function isDismissed(userId: string, eventId: string) {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getDismissedKey(userId, eventId)) === '1';
}

export function EventCongratulationModal({ events, currentUserId, onClose }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleEvents = events.filter(e => !dismissedIds.has(e.id));

  if (visibleEvents.length === 0) return null;

  const event = visibleEvents[0]; // 한 번에 하나씩 표시
  const winnerTitle = getUserTitle(event.winnerUserName);

  const handleDismiss = () => {
    localStorage.setItem(getDismissedKey(currentUserId, event.id), '1');
    const next = new Set(dismissedIds);
    next.add(event.id);
    setDismissedIds(next);
    if (next.size >= events.length) onClose();
  };

  const handleClose = () => {
    const next = new Set(dismissedIds);
    next.add(event.id);
    setDismissedIds(next);
    if (next.size >= events.length) onClose();
  };

  const isWinner = event.winnerUserId === currentUserId;

  useEffect(() => {
    if (visibleEvents.length > 0) {
      // 거대한 양쪽 사이드 축포를 팝업이 떠 있는 내내 지속적으로 쏘아올림
      const fireBigCannons = () => {
        const defaults = { startVelocity: 45, spread: 80, ticks: 100, zIndex: 9999, particleCount: 100 };
        
        // 왼쪽 축포
        confetti({ ...defaults, angle: 60, origin: { x: 0, y: 0.8 }, colors: ['#fbbf24', '#f59e0b', '#ef4444', '#ffffff'] });
        // 오른쪽 축포
        confetti({ ...defaults, angle: 120, origin: { x: 1, y: 0.8 }, colors: ['#3b82f6', '#10b981', '#f59e0b', '#ffffff'] });
        // 중앙 폭죽 (작게)
        confetti({ startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, particleCount: 40, origin: { x: 0.5, y: 0.3 } });
      };

      // 처음 1회 (뜨자마자 크게)
      fireBigCannons();
      
      // 이후 4회 (1.2초 간격) - 총 5회
      let count = 1;
      const interval: any = setInterval(() => {
        if (count >= 5) {
          clearInterval(interval);
          return;
        }
        fireBigCannons();
        count++;
      }, 1200);
      
      // 모달이 닫히면(unmount) interval 정리하여 폭죽 중단
      return () => clearInterval(interval);
    }
  }, [visibleEvents.length, event?.id]);

  return (
    <Dialog open={true} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-xs sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogTitle className="sr-only">이벤트 달성 축하</DialogTitle>
        {/* 배경 그라디언트 */}
        <div className="bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-400 p-6 text-center relative overflow-hidden">
          {/* 윗부분: 배경이 꽉 찰 정도로 화려한 장식 효과들 */}
          <div className="absolute top-1 left-2 text-3xl opacity-50 animate-pulse">✨</div>
          <div className="absolute top-8 left-10 text-2xl opacity-60 animate-bounce delay-100">🌟</div>
          <div className="absolute top-3 left-1/3 text-xl opacity-40 animate-ping delay-300">💫</div>
          <div className="absolute top-10 left-1/4 text-4xl opacity-50 rotate-45 animate-pulse delay-500">🎇</div>
          
          <div className="absolute top-2 right-4 text-3xl opacity-60 animate-pulse delay-200">✨</div>
          <div className="absolute top-7 right-12 text-2xl opacity-50 animate-bounce delay-300">🌟</div>
          <div className="absolute top-4 right-1/3 text-xl opacity-40 animate-ping delay-100">💫</div>
          <div className="absolute top-11 right-1/4 text-4xl opacity-50 -rotate-45 animate-pulse delay-700">🎆</div>

          <div className="absolute bottom-2 left-6 text-3xl opacity-70 animate-bounce delay-500">🎊</div>
          <div className="absolute bottom-5 left-1/3 text-4xl opacity-50 rotate-12 animate-pulse delay-200">🎇</div>
          <div className="absolute bottom-3 right-6 text-3xl opacity-70 animate-bounce delay-150">🎊</div>
          <div className="absolute bottom-6 right-1/3 text-4xl opacity-50 -rotate-12 animate-pulse delay-400">🎆</div>
          
          <div className="absolute inset-0 w-full h-full pointer-events-none opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0id2hpdGUiLz48L3N2Zz4=')] mix-blend-overlay"></div>

          {/* 메인 타이틀 영역 */}
          <div className="relative z-10">
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <h2 className="text-3xl font-extrabold text-white tracking-wide" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
              축하합니다!
            </h2>
            <div className="flex justify-center gap-3 mt-2 text-3xl">
              <span className="animate-pulse">🎊</span>
              <span className="animate-spin-slow" style={{ animationDuration: '4s' }}>☀️</span>
              <span className="animate-pulse delay-150">🎊</span>
            </div>
          </div>
        </div>

        {/* 내용 */}
        <div className="bg-white dark:bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
          {/* 아랫부분: 배경을 가득 채우는 장식용 배경 이모지 */}
          <div className="absolute top-2 left-3 text-3xl opacity-30 animate-pulse">✨</div>
          <div className="absolute top-10 left-8 text-2xl opacity-40 animate-bounce delay-300">🌟</div>
          <div className="absolute top-5 left-20 text-4xl opacity-20 animate-spin-slow">🎈</div>
          <div className="absolute top-16 left-2 text-xl opacity-30 animate-pulse delay-500">💫</div>
          <div className="absolute top-1/2 -left-2 text-5xl opacity-20 animate-pulse rotate-45">🎊</div>

          <div className="absolute top-3 right-4 text-3xl opacity-30 animate-pulse delay-150">✨</div>
          <div className="absolute top-12 right-6 text-2xl opacity-40 animate-bounce delay-500">🌟</div>
          <div className="absolute top-6 right-20 text-4xl opacity-20 animate-spin-slow">🎈</div>
          <div className="absolute top-14 right-3 text-xl opacity-30 animate-pulse delay-200">💫</div>
          <div className="absolute top-1/2 -right-2 text-5xl opacity-20 animate-pulse -rotate-45">🎉</div>

          <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white leading-snug">
            종로지원 <span className="text-amber-500 font-extrabold text-2xl">{event.lightThreshold.toLocaleString()}</span>번째 빛 달성!!
          </p>
          
          <div className="my-5 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/50 shadow-inner relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👑</div>
            <p className="text-lg md:text-xl text-amber-600 dark:text-amber-400 font-extrabold flex items-center justify-center gap-2 mt-2">
              <span className="animate-bounce">🏆</span> 
              {event.winnerUserName} {winnerTitle}님 
              <span className="animate-bounce" style={{ animationDelay: '200ms' }}>🏆</span>
            </p>
            <p className="text-sm md:text-base font-semibold text-amber-700/80 dark:text-amber-500 mt-1">
              정말 축하드립니다!
            </p>
          </div>

          {isWinner && (
            <div className="mt-2 inline-block px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 rounded-full border border-yellow-300 dark:border-yellow-700 shadow-sm animate-in zoom-in duration-300">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                🌟 우와! 이번 이벤트의 당첨자가 되셨습니다! 🌟
              </p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 mt-5">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-slate-400 hover:text-slate-600"
              onClick={handleDismiss}
            >
              더 이상 보지 않기
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold"
              onClick={handleClose}
            >
              닫기
            </Button>
          </div>
        </div>

        {/* 진행 인디케이터 */}
        {events.length > 1 && (
          <div className="bg-white dark:bg-slate-900 pb-3 flex justify-center gap-1.5">
            {events.map((e, i) => (
              <div
                key={e.id}
                className={`h-1.5 rounded-full transition-all ${i === events.indexOf(event) ? 'w-4 bg-amber-500' : dismissedIds.has(e.id) ? 'w-1.5 bg-slate-200' : 'w-1.5 bg-slate-300'}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
