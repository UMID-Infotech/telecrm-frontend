// teleCRM/app/superadmin/organizations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  FileText,
  MoreHorizontal,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Org {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  _count: { users: number; teams: number; leads: number };
}

export default function SuperAdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = () => {
    api
      .get<Org[]>('/superadmin/organizations')
      .then((res) => setOrgs(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const toggleStatus = async (id: string, current: 'ACTIVE' | 'INACTIVE') => {
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await api.patch(`/superadmin/organizations/${id}/status`, { status: next });
    fetchOrgs();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Organizations</h1>
        <p className="text-sm text-zinc-500 mt-1">
          All registered tenants on the platform
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium hidden sm:table-cell">
                  Users
                </th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium hidden md:table-cell">
                  Leads
                </th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium hidden lg:table-cell">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                        <Building2 size={13} className="text-blue-400" />
                      </div>
                      <span className="text-white font-medium">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      <Users size={13} className="text-zinc-600" />
                      {org._count.users}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <FileText size={13} className="text-zinc-600" />
                      {org._count.leads}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        org.status === 'ACTIVE'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {org.status === 'ACTIVE' ? (
                        <CheckCircle size={10} />
                      ) : (
                        <XCircle size={10} />
                      )}
                      {org.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden lg:table-cell text-xs">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-700"
                        >
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-zinc-900 border-zinc-700 text-zinc-200"
                      >
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-zinc-800"
                          onClick={() => toggleStatus(org.id, org.status)}
                        >
                          {org.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-zinc-800"
                          onClick={() =>
                            (window.location.href = `/superadmin/organizations/${org.id}`)
                          }
                        >
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orgs.length === 0 && (
            <div className="text-center py-10 text-zinc-600">
              No organizations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
