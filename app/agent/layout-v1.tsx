//telecrm/app/agent/layout.tsx
import { ReactNode } from 'react';
import AgentHeader from '@/components/agent/AgentHeader';
import AgentSidebar from '@/components/agent/AgentSidebar';
import AgentFooter from '@/components/agent/AgentFooter';

export default function AgentLayout({ children }: { children: ReactNode }) {
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
