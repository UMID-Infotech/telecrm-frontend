// teleCRM/hooks/useInactivityLogout.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clearAuth } from '@/lib/auth';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 10 minutes

/**
 * Tracks user inactivity across:
 *  - mouse (move, down, click)
 *  - keyboard (keydown, keypress)
 *  - scroll / wheel / touch
 *  - page visibility change (tab regain focus)
 *  - API calls via the custom 'api-activity' event dispatched in lib/api.ts
 *
 * After INACTIVITY_TIMEOUT_MS of complete silence across all the above,
 * clears auth, shows a Sonner toast, and redirects to /login.
 */
export function useInactivityLogout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearAuth();
    toast.warning('You have been logged out due to inactivity.', {
      duration: 6000,
    });
    router.push('/login');
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    // Standard DOM activity events
    const domEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'keypress',
      'scroll',
      'wheel',
      'touchstart',
      'touchmove',
      'click',
      'focus',
      'visibilitychange',
    ];

    domEvents.forEach((e) =>
      window.addEventListener(e, resetTimer, { passive: true }),
    );

    // Custom event fired by lib/api.ts on every outgoing request.
    // This means dashboard auto-refreshes and any API calls also
    // count as activity and reset the inactivity timer.
    window.addEventListener('api-activity', resetTimer);

    // Start the initial timer
    resetTimer();

    return () => {
      domEvents.forEach((e) => window.removeEventListener(e, resetTimer));
      window.removeEventListener('api-activity', resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // Optionally expose resetTimer for manual calls
  return { resetInactivityTimer: resetTimer };
}