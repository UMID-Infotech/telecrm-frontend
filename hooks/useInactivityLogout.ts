// teleCRM/hooks/useInactivityLogout.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;
export const INACTIVITY_TOAST_KEY = "show_inactivity_toast";

export function useInactivityLogout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearAuth();
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

    window.addEventListener("api-activity", resetTimer);

    // visibilitychange belongs to DocumentEventMap, not WindowEventMap
    document.addEventListener("visibilitychange", resetTimer);

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