// telecrm/app/agent/layout.tsx
"use client";

import { ReactNode } from "react";
import AgentHeader from "@/components/agent/AgentHeader";
import AgentSidebar from "@/components/agent/AgentSidebar";
import AgentFooter from "@/components/agent/AgentFooter";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

export default function AgentLayout({ children }: { children: ReactNode }) {
  // Starts the 10-minute inactivity timer for L3 agents.
  // Any mouse, keyboard, scroll, touch, or visibility event resets it.
  useInactivityLogout();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <AgentHeader />

      <div className="flex flex-1">
        {/* Sidebar (desktop only) */}
        <AgentSidebar />

        {/* Main Content */}
        <main className="flex-1 p-4">{children}</main>
      </div>

      <AgentFooter />
    </div>
  );
}
