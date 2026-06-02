// teleCRM/components/admin/AdminSidebar.tsx
import Link from 'next/link';
import {
  LayoutDashboard,
  UserPlus,
  Building2,
  Users,
  ClipboardList,
  PlusCircle,
} from 'lucide-react';
import { FiBookOpen } from 'react-icons/fi';

export default function AdminSidebar() {
  return (
    <aside className="hidden md:flex w-64 bg-slate-900 text-white p-4">
      <nav className="space-y-2 w-full">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/admin/users/add"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <UserPlus size={18} />
          <span>Add User</span>
        </Link>
        <Link
          href="/admin/departments/add"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <Building2 size={18} />
          <span>Add Department</span>
        </Link>
        <Link
          href="/admin/teams/create"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <Users size={18} />
          <span>Create Team</span>
        </Link>
        <Link
          href="/admin/leads"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <ClipboardList size={18} />
          <span>Leads</span>
        </Link>
        <Link
          href="/admin/leads/create"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <PlusCircle size={18} />
          <span>Create Lead</span>
        </Link>
        <Link
          href="/admin/guide-blogs"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800"
        >
          <FiBookOpen size={18} />
          <span>Guide Blogs</span>
        </Link>
      </nav>
    </aside>
  );
}
