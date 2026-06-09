// teleCRM/components/agent/AgentSidebar.tsx
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Activity,
} from 'lucide-react';
import { FiBookOpen } from 'react-icons/fi';

export default function AgentSidebar() {
  return (
    <aside className="hidden md:flex w-64 bg-slate-900 text-white p-4">
      <nav className="space-y-1 w-full">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">
          Agent
        </p>
        <Link
          href="/agent"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors"
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/agent/leads"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors"
        >
          <ClipboardList size={18} />
          <span>My Leads</span>
        </Link>
        <Link
          href="/agent/leads/create"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors"
        >
          <PlusCircle size={18} />
          <span>Create Lead</span>
        </Link>
        <Link
          href="/agent/guides"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <FiBookOpen size={18} />
          <span>Team Guides</span>
        </Link>
      </nav>
    </aside>
  );
}
