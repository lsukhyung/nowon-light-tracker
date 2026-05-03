'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PersonalEvent } from '@/types/training';
import { api } from '@/lib/api';
import { isPersonalEventDismissed } from '@/components/events/personal-event-congratulation-modal';

const sessionClosedIds = new Set<string>();

/**
 * 개인 이벤트 축하 팝업 훅
 * - 로그인 후 / 새로고침 / 백그라운드 복귀 시 타인의 개인 이벤트 달성 팝업 표시
 * - useEventPopup과 동일한 패턴
 */
export function usePersonalEventPopup(userId: string | undefined) {
  const [eventsToShow, setEventsToShow] = useState<PersonalEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const isChecking = useRef(false);

  const checkEvents = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return;
    if (isChecking.current) return;
    isChecking.current = true;
    try {
      const events: PersonalEvent[] = await api.getPersonalEvents();
      if (signal?.aborted) return;

      // 타인의 달성 이벤트 중 아직 확인하지 않은 것만 필터
      const toShow = events.filter(
        e => e.achievedAt !== null
          && e.userId !== userId
          && !isPersonalEventDismissed(userId, e.id)
          && !sessionClosedIds.has(e.id)
      );
      if (toShow.length > 0) {
        setEventsToShow(toShow);
        setIsOpen(true);
      }
    } catch {
      // 조회 실패 시 무시
    } finally {
      isChecking.current = false;
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    if (userId) {
      checkEvents(controller.signal);
    }
    return () => {
      controller.abort();
    };
  }, [userId, checkEvents]);

  useEffect(() => {
    if (!userId) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkEvents();
    };
    const handleFocus = () => checkEvents();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, checkEvents]);

  const handleClose = useCallback(() => {
    eventsToShow.forEach(e => sessionClosedIds.add(e.id));
    setIsOpen(false);
    setEventsToShow([]);
  }, [eventsToShow]);

  return { eventsToShow, isOpen, handleClose };
}
