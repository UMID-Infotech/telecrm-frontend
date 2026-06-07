// teleCRM/frontend/hooks/useInactivityLogout.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
export const INACTIVITY_TOAST_KEY = "show_inactivity_toast";

/**
 * Tracks user inactivity across:
 *  - mouse (move, down, click)
 *  - keyboard (keydown, keypress)
 *  - scroll / wheel / touch
 *  - page visibility change (tab regain focus)
 *  - API calls via the custom 'api-activity' event dispatched in lib/api.ts
 *
 * After INACTIVITY_TIMEOUT_MS of complete silence across all the above,
 * clears auth, sets a sessionStorage flag, and redirects to /login.
 * The login page reads that flag and shows the Sonner toast there.
 */
export function useInactivityLogout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearAuth();
    // Set flag BEFORE navigating — login page will read this and show the toast
    sessionStorage.setItem(INACTIVITY_TOAST_KEY, "1");
    router.push("/login");
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    const domEvents: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "keypress",
      "scroll",
      "wheel",
      "touchstart",
      "touchmove",
      "click",
      "focus",
    ];

    domEvents.forEach((e) =>
      window.addEventListener(e, resetTimer, { passive: true }),
    );

    // Custom event fired by lib/api.ts on every outgoing request
    window.addEventListener("api-activity", resetTimer);

    // visibilitychange belongs to DocumentEventMap, not WindowEventMap
    document.addEventListener("visibilitychange", resetTimer);

    // Start the initial timer
    resetTimer();

    return () => {
      domEvents.forEach((e) => window.removeEventListener(e, resetTimer));
      window.removeEventListener("api-activity", resetTimer);
      document.removeEventListener("visibilitychange", resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return { resetInactivityTimer: resetTimer };
}

