// teleCRM/app/superadmin/admins/add/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  UserPlus,
  Building2,
  Mail,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function SuperAdminAddL1Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    try {
      await api.post('/auth/signup', {
        organizationName: formData.get('orgName'),
        organizationEmail: formData.get('orgEmail'),
        organizationPassword: formData.get('orgPassword'),
        adminEmail: formData.get('adminEmail'),
        adminPassword: formData.get('adminPassword'),
        adminDesignation: 'Admin', // locked value
      });

      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create organization and admin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Add Organization & Admin</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Creates a new tenant organization and its L1 admin account
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-950/50 border border-emerald-800/50 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">
            Organization and admin created successfully.
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-950/50 border border-rose-800/50 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {/* Form card */}
      <form onSubmit={handleSubmit}>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

          {/* ── Organization section ── */}
          <div className="px-5 pt-5 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                <Building2 size={12} className="text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Organization
              </span>
            </div>

            <div className="space-y-3">
              <Field
                name="orgName"
                label="Organization Name"
                placeholder="e.g. Acme Corp"
                icon={Building2}
              />
              <Field
                name="orgEmail"
                label="Organization Email"
                type="email"
                placeholder="e.g. contact@acme.com"
                icon={Mail}
              />
              <Field
                name="orgPassword"
                label="Organization Password"
                type="password"
                placeholder="Min. 6 characters"
                icon={Lock}
              />
            </div>
          </div>

          {/* ── Admin section ── */}
          <div className="px-5 pt-4 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-rose-600/20 border border-rose-600/30 flex items-center justify-center">
                <UserPlus size={12} className="text-rose-400" />
              </div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                L1 Admin Account
              </span>
            </div>

            <div className="space-y-3">
              <Field
                name="adminEmail"
                label="Admin Email"
                type="email"
                placeholder="e.g. admin@acme.com"
                icon={Mail}
              />
              <Field
                name="adminPassword"
                label="Admin Password"
                type="password"
                placeholder="Min. 6 characters"
                icon={Lock}
              />

              {/* Designation — locked to "Admin" */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Designation
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                    <UserPlus size={14} />
                  </div>
                  <input
                    name="designation"
                    value="Admin"
                    disabled
                    readOnly
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-500 cursor-not-allowed select-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zinc-600 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                    locked
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="px-5 pb-5">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  Create Organization & Admin
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Reusable field component ──────────────────────────────────
function Field({
  name,
  label,
  type = 'text',
  placeholder,
  icon: Icon,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
          <Icon size={14} />
        </div>
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-rose-600/60 focus:ring-1 focus:ring-rose-600/30 transition-colors"
        />
      </div>
    </div>
  );
}