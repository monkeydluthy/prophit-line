'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to handle mobile touch events more reliably
 * This ensures clicks work on the first tap on mobile devices
 */
export function useMobileTouchHandler(onClick: () => void) {
  const touchStartRef = useRef<number | null>(null);
  const touchTargetRef = useRef<EventTarget | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = Date.now();
    touchTargetRef.current = e.target;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !touchTargetRef.current) return;
    
    const touchDuration = Date.now() - touchStartRef.current;
    // Only trigger if it was a quick tap (not a swipe)
    if (touchDuration < 300 && e.target === touchTargetRef.current) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
    
    touchStartRef.current = null;
    touchTargetRef.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    // On mobile, if touch was handled, ignore click
    if (touchStartRef.current !== null) {
      e.preventDefault();
      return;
    }
    onClick();
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onClick: handleClick,
  };
}









