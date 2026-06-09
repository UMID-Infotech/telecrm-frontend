//telecrm/app/leads/[leadId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import MobileLeadDetail from "@/components/agent/for-mobile/page";
import DesktopLeadDetail from "@/components/agent/for-desktop/page";

// ─── Hook: Detect Mobile Viewport ─────────────────────────────────────────────

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AgentLeadDetailPage() {
  const isMobile = useIsMobile();

  // ── Render ────────────────────────────────────────────────────────────────

  return isMobile ? <MobileLeadDetail /> : <DesktopLeadDetail />;
}