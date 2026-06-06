import { useEffect, useRef } from 'react';

interface UseSwipeHorizontalOptions {
  /** Swipe left → onSwipeLeft() (e.g. 다음 날) */
  onSwipeLeft: () => void;
  /** Swipe right → onSwipeRight() (e.g. 이전 날) */
  onSwipeRight: () => void;
  /** Minimum horizontal distance (px) to count as a swipe. Default 60. */
  threshold?: number;
  /** Maximum vertical distance (px) allowed for a horizontal swipe — prevents accidental trigger while scrolling. Default 40. */
  maxVertical?: number;
  /** Maximum swipe duration (ms). Default 600. */
  maxDuration?: number;
}

/**
 * 좌우 스와이프 제스처 감지 훅.
 *
 * 터치 이벤트를 통해 가로 스와이프를 감지하며, 다음을 보장합니다:
 * - 버튼/입력/캘린더 등 인터랙티브 요소에서 시작한 터치는 무시 (use-pull-to-refresh와 동일한 정책)
 * - 세로 스크롤과 충돌하지 않음 (maxVertical 임계값)
 * - 다음/이전 버튼 클릭과 충돌하지 않음 (BUTTON 요소 내부에서 시작 시 무시)
 */
export function useSwipeHorizontal({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  maxVertical = 40,
  maxDuration = 600,
}: UseSwipeHorizontalOptions) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    const isInteractive = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON' ||
        target.closest('button') !== null ||
        target.closest('input') !== null ||
        target.closest('textarea') !== null ||
        target.closest('select') !== null ||
        target.closest('a') !== null ||
        target.closest('[role="switch"]') !== null ||
        target.closest('[role="slider"]') !== null ||
        target.closest('[role="combobox"]') !== null ||
        target.closest('[role="checkbox"]') !== null ||
        target.closest('[role="menu"]') !== null ||
        target.closest('[role="menuitem"]') !== null ||
        target.closest('[role="gridcell"]') !== null ||
        target.closest('[role="option"]') !== null ||
        target.closest('[role="listbox"]') !== null ||
        target.closest('[data-radix-scroll-area-viewport]') !== null ||
        target.closest('[data-radix-popper-content-wrapper]') !== null ||
        target.closest('[data-radix-menu-content]') !== null ||
        target.closest('[data-radix-dropdown-menu-content]') !== null ||
        target.closest('[data-radix-select-content]') !== null ||
        target.closest('[data-calendar]') !== null ||
        target.closest('.rdp') !== null ||
        target.closest('table') !== null
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isInteractive(e.target)) {
        tracking.current = false;
        return;
      }
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startTime.current = Date.now();
      tracking.current = true;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;
      const elapsed = Date.now() - startTime.current;

      if (Math.abs(dy) > maxVertical) return;
      if (elapsed > maxDuration) return;
      if (Math.abs(dx) < threshold) return;

      if (dx < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    };

    const handleTouchCancel = () => {
      tracking.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onSwipeLeft, onSwipeRight, threshold, maxVertical, maxDuration]);
}
