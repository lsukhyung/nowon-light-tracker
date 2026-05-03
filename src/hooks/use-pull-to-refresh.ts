import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  pullDownThreshold?: number;
  maxPullDown?: number;
  refreshTimeout?: number;
}

export function usePullToRefresh({
  onRefresh,
  pullDownThreshold = 80,
  maxPullDown = 120,
  refreshTimeout = 1000,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // 입력 요소 및 인터랙티브 컴포넌트에서 시작된 터치는 무시
      const target = e.target as HTMLElement;
      const isInteractiveElement = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.tagName === 'SELECT' ||
                            target.tagName === 'BUTTON' ||
                            target.closest('button') ||
                            target.closest('input') ||
                            target.closest('textarea') ||
                            target.closest('select') ||
                            target.closest('a') ||
                            // Radix UI 컴포넌트들
                            target.closest('[role="switch"]') ||
                            target.closest('[role="slider"]') ||
                            target.closest('[role="combobox"]') ||
                            target.closest('[role="checkbox"]') ||
                            target.closest('[role="menu"]') ||
                            target.closest('[role="menuitem"]') ||
                            target.closest('[role="gridcell"]') ||
                            target.closest('[role="option"]') ||
                            target.closest('[role="listbox"]') ||
                            target.closest('[data-radix-scroll-area-viewport]') ||
                            // Radix 포털/팝오버 (드롭다운, 캘린더 등)
                            target.closest('[data-radix-popper-content-wrapper]') ||
                            target.closest('[data-radix-menu-content]') ||
                            target.closest('[data-radix-dropdown-menu-content]') ||
                            target.closest('[data-radix-select-content]') ||
                            // 캘린더
                            target.closest('[data-calendar]') ||
                            target.closest('.rdp') ||
                            target.closest('table');

      if (isInteractiveElement) return;

      // 스크롤이 맨 위에 있을 때만 동작
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;

      // 아래로 당길 때만 (양수)
      if (distance > 0 && container.scrollTop === 0) {
        // 당기는 저항감을 주기 위해 제한
        const limitedDistance = Math.min(distance * 0.5, maxPullDown);
        setPullDistance(limitedDistance);

        // 임계값을 넘으면 새로고침 준비
        if (limitedDistance >= pullDownThreshold) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      setIsPulling(false);

      // 임계값을 넘었으면 새로고침
      if (pullDistance >= pullDownThreshold) {
        setIsRefreshing(true);

        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        }

        // 최소 시간 동안 로딩 표시
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, refreshTimeout);
      } else {
        // 임계값 미달이면 원위치
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, isRefreshing, pullDistance, pullDownThreshold, maxPullDown, onRefresh, refreshTimeout]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
  };
}
