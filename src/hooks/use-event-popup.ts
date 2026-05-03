'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Event } from '@/types/training';
import { api } from '@/lib/api';
import { isDismissed } from '@/components/events/event-congratulation-modal';

/**
 * 세션 내에서 이미 팝업으로 보여준 뒤 닫은 이벤트 ID를 추적.
 * 페이지 리로드 시 초기화되므로 새로고침하면 다시 보여줌.
 * "더 이상 보지 않기"로 닫은 이벤트는 localStorage에 저장되므로 여기와 무관.
 */
const sessionClosedIds = new Set<string>();

/**
 * 전역 이벤트 팝업 훅
 * - 로그인 후 / 새로고침 / 백그라운드 복귀 시 당첨 이벤트 팝업 표시
 */
export function useEventPopup(userId: string | undefined) {
  const [eventsToShow, setEventsToShow] = useState<Event[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const isChecking = useRef(false);

  const checkEvents = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return;
    // 이미 팝업이 열려 있거나 체크 중이면 중복 호출 방지
    if (isChecking.current) return;
    isChecking.current = true;
    try {
      const events: Event[] = await api.getEvents();
      if (signal?.aborted) return;
      
      const toShow = events.filter(
        e => e.winnerUserId !== null
          && !isDismissed(userId, e.id)
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

  // 1) 마운트(로그인/새로고침) 시 비동기 확인
  useEffect(() => {
    const controller = new AbortController();
    if (userId) {
      checkEvents(controller.signal);
    }
    return () => {
      controller.abort();
    };
  }, [userId, checkEvents]);

  // 2) 백그라운드 복귀 & 포커스 복귀
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
    // 닫은 이벤트들을 세션 내 "이미 봄" 목록에 추가
    eventsToShow.forEach(e => sessionClosedIds.add(e.id));
    setIsOpen(false);
    setEventsToShow([]);
  }, [eventsToShow]);

  return { eventsToShow, isOpen, handleClose };
}
