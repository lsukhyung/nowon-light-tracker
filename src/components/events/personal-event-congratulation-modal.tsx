'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PersonalEvent } from '@/types/training';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { getUserTitle } from '@/lib/user-titles';

interface Props {
  events: PersonalEvent[];
  currentUserId: string;
  onClose: () => void;
}

function getDismissedKey(userId: string, eventId: string) {
  return `personal_event_dismissed_${userId}_${eventId}`;
}

export function isPersonalEventDismissed(userId: string, eventId: string) {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getDismissedKey(userId, eventId)) === '1';
}

export function PersonalEventCongratulationModal({ events, currentUserId, onClose }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleEvents = events.filter(e => !dismissedIds.has(e.id));

  if (visibleEvents.length === 0) return null;

  const event = visibleEvents[0];
  const isAchiever = event.userId === currentUserId;
  const achieverTitle = getUserTitle(event.userName || '');

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

  useEffect(() => {
    if (visibleEvents.length > 0) {
      const fireBigCannons = () => {
        const defaults = { startVelocity: 45, spread: 80, ticks: 100, zIndex: 9999, particleCount: 100 };
        confetti({ ...defaults, angle: 60, origin: { x: 0, y: 0.8 }, colors: ['#fbbf24', '#f59e0b', '#ef4444', '#ffffff'] });
        confetti({ ...defaults, angle: 120, origin: { x: 1, y: 0.8 }, colors: ['#3b82f6', '#10b981', '#f59e0b', '#ffffff'] });
        confetti({ startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, particleCount: 40, origin: { x: 0.5, y: 0.3 } });
      };

      fireBigCannons();

      let count = 1;
      const interval: any = setInterval(() => {
        if (count >= 5) { clearInterval(interval); return; }
        fireBigCannons();
        count++;
      }, 1200);

      return () => clearInterval(interval);
    }
  }, [visibleEvents.length, event?.id]);

  return (
    <Dialog open={true} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-xs sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogTitle className="sr-only">개인 이벤트 달성 축하</DialogTitle>
        {/* 배경 그라디언트 */}
        <div className="bg-gradient-to-br from-pink-400 via-rose-300 to-red-400 p-6 text-center relative overflow-hidden">
          <div className="absolute top-1 left-2 text-3xl opacity-50 animate-pulse">✨</div>
          <div className="absolute top-8 left-10 text-2xl opacity-60 animate-bounce">🌟</div>
          <div className="absolute top-2 right-4 text-3xl opacity-60 animate-pulse">✨</div>
          <div className="absolute top-7 right-12 text-2xl opacity-50 animate-bounce">🌟</div>
          <div className="absolute bottom-2 left-6 text-3xl opacity-70 animate-bounce">🎊</div>
          <div className="absolute bottom-3 right-6 text-3xl opacity-70 animate-bounce">🎊</div>

          <div className="relative z-10">
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <h2 className="text-3xl font-extrabold text-white tracking-wide" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
              축하합니다!
            </h2>
            <div className="flex justify-center gap-3 mt-2 text-3xl">
              <span className="animate-pulse">🎊</span>
              <span className="animate-spin-slow" style={{ animationDuration: '4s' }}>🌸</span>
              <span className="animate-pulse delay-150">🎊</span>
            </div>
          </div>
        </div>

        {/* 내용 */}
        <div className="bg-white dark:bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
          {/* 꽃다발 이미지 */}
          {event.bouquetImageUrl ? (
            <div className="mb-4 flex justify-center">
              <img
                src={event.bouquetImageUrl}
                alt="꽃다발"
                className="w-48 h-48 object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="text-6xl mb-4">💐</div>
          )}

          <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white leading-snug">
            <span className="text-rose-500 font-extrabold text-2xl">{event.lightThreshold.toLocaleString()}</span>빛 달성!!
          </p>

          <div className="my-5 p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/50 shadow-inner relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👑</div>
            <p className="text-lg md:text-xl text-rose-600 dark:text-rose-400 font-extrabold flex items-center justify-center gap-2 mt-2">
              <span className="animate-bounce">🏆</span>
              {event.userName || '도반'} {achieverTitle}님
              <span className="animate-bounce" style={{ animationDelay: '200ms' }}>🏆</span>
            </p>
            <p className="text-sm md:text-base font-semibold text-rose-700/80 dark:text-rose-500 mt-1">
              &quot;{event.name}&quot; 목표를 달성했습니다!
            </p>
          </div>

          {isAchiever && (
            <div className="mt-2 inline-block px-4 py-2 bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 rounded-full border border-pink-300 dark:border-pink-700 shadow-sm animate-in zoom-in duration-300">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                🌟 개인 이벤트 목표를 달성하셨습니다! 🌟
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
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold"
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
                className={`h-1.5 rounded-full transition-all ${i === events.indexOf(event) ? 'w-4 bg-rose-500' : dismissedIds.has(e.id) ? 'w-1.5 bg-slate-200' : 'w-1.5 bg-slate-300'}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
