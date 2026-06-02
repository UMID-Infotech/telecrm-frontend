//teleCRM/components/manager/ManagerSidebar.tsx
import Link from 'next/link';
import {
  LayoutDashboard,
  UserPlus,
  Building2,
  Users,
  ClipboardList,
} from 'lucide-react';
import { FiBookOpen } from 'react-icons/fi';

export default function ManagerSidebar() {
  return (
    <aside className="hidden md:flex w-64 bg-slate-900 text-white p-4">
      <nav className="space-y-2 w-full">
        <Link
          href="/manager"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/manager/leads"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <ClipboardList size={18} />
          <span>Leads</span>
        </Link>
        <Link
          href="/manager/guides"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <FiBookOpen size={18} />
          <span>Team Guides</span>
        </Link>
      </nav>
    </aside>
  );
}
