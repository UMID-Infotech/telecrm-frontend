// teleCRM/components/superadmin/SuperAdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  Shield,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    href: '/superadmin',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Organizations',
    href: '/superadmin/organizations',
    icon: Building2,
    exact: false,
  },
  {
    label: 'All Users',
    href: '/superadmin/users',
    icon: Users,
    exact: false,
  },
  {
    label: 'Add Admin (L1)',
    href: '/superadmin/admins/add',
    icon: UserPlus,
    exact: false,
  },
  {
    label: 'Analytics',
    href: '/superadmin/analytics',
    icon: BarChart3,
    exact: false,
  },
  {
    label: 'Settings',
    href: '/superadmin/settings',
    icon: Settings,
    exact: false,
  },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 bg-zinc-950 border-r border-zinc-800 flex-col shrink-0">
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60',
              )}
            >
              <Icon
                size={16}
                className={cn(active ? 'text-rose-400' : 'text-zinc-500')}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer badge */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rose-950/40 border border-rose-900/40">
          <Shield size={13} className="text-rose-400" />
          <span className="text-[11px] text-rose-400 font-medium">
            Super Admin Mode
          </span>
        </div>
      </div>
    </aside>
  );
}