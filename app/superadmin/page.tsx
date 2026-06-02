// teleCRM/app/superadmin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  FileText,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';

interface PlatformStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  activeUsers: number;
  totalLeads: number;
  pendingLeads: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, sub, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}
      >
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-sm text-zinc-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<PlatformStats>('/superadmin/stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load platform stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Platform Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Real-time metrics across all tenants
        </p>
      </div>

      {/* Stats grid */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-24 animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-4 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Organizations"
            value={stats.totalOrgs}
            sub={`${stats.activeOrgs} active`}
            icon={Building2}
            color="bg-blue-600"
          />
          <StatCard
            label="Active Organizations"
            value={stats.activeOrgs}
            sub={`${stats.totalOrgs - stats.activeOrgs} inactive`}
            icon={TrendingUp}
            color="bg-emerald-600"
          />
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            sub={`${stats.activeUsers} active`}
            icon={Users}
            color="bg-violet-600"
          />
          <StatCard
            label="Active Users"
            value={stats.activeUsers}
            sub={`Across all orgs`}
            icon={Activity}
            color="bg-amber-600"
          />
          <StatCard
            label="Total Leads"
            value={stats.totalLeads}
            sub={`Platform-wide`}
            icon={FileText}
            color="bg-sky-600"
          />
          <StatCard
            label="Pending Leads"
            value={stats.pendingLeads}
            sub={`Awaiting approval`}
            icon={Clock}
            color="bg-rose-600"
          />
        </div>
      )}

      {/* Quick links */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'View Organizations', href: '/superadmin/organizations' },
            { label: 'Manage Users', href: '/superadmin/users' },
            { label: 'Analytics', href: '/superadmin/analytics' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
