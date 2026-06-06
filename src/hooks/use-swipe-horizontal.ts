import { useEffect, useRef, useCallback } from 'react';

interface UseSwipeHorizontalOptions {
  /** Swipe left → onSwipeLeft() (e.g. 다음 날) */
  onSwipeLeft: () => void;
  /** Swipe right → onSwipeRight() (e.g. 이전 날) */
  onSwipeRight: () => void;
  /** Minimum horizontal distance (px) to count as a swipe. Default 60. */
  threshold?: number;
  /** Maximum vertical distance (px) allowed for a horizontal swipe. Default 40. */
  maxVertical?: number;
  /** Maximum swipe duration (ms). Default 600. */
  maxDuration?: number;
}

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
  const locked = useRef<'h' | 'v' | null>(null);

  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  const reset = useCallback(() => {
    tracking.current = false;
    locked.current = null;
  }, []);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isInteractive(e.target)) {
        reset();
        return;
      }
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startTime.current = Date.now();
      tracking.current = true;
      locked.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;

      if (locked.current === null) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          locked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }
      }

      if (locked.current === 'h') {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!tracking.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;
      const elapsed = Date.now() - startTime.current;

      reset();

      if (locked.current === 'v') return;
      if (Math.abs(dy) > maxVertical) return;
      if (elapsed > maxDuration) return;
      if (Math.abs(dx) < threshold) return;

      if (dx < 0) {
        onSwipeLeftRef.current();
      } else {
        onSwipeRightRef.current();
      }
    };

    const handleTouchCancel = () => {
      reset();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [threshold, maxVertical, maxDuration, reset]);
}
