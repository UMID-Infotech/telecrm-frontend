// teleCRM/app/superadmin/admins/add/page.tsx
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  UserPlus,
  Building2,
  Mail,
  Lock,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function SuperAdminAddL1Page() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    orgName: string;
    email: string;
  } | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await api.post('/superadmin/admins', {
        organizationName: formData.get('orgName'),
        adminEmail: formData.get('adminEmail'),
        adminPassword: formData.get('adminPassword'),
        adminDesignation: formData.get('adminDesignation') || 'Admin',
      });

      setSuccess({
        orgName: res.data.organizationName,
        email: res.data.adminEmail,
      });
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to create organization and admin.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white">
          Add Organization & Admin
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Creates a new tenant organization and its L1 admin account. A welcome
          email with login credentials will be sent automatically.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-start gap-3 bg-emerald-950/50 border border-emerald-800/50 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-300 font-medium">
              Organization &amp; admin created successfully!
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              <span className="text-emerald-500">{success.orgName}</span> —
              welcome email sent to{' '}
              <span className="text-emerald-500">{success.email}</span>
            </p>
          </div>
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

            <Field
              name="orgName"
              label="Organization Name"
              placeholder="e.g. Acme Corp"
              icon={Building2}
            />
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
                label="Temporary Password"
                type="password"
                placeholder="Min. 6 characters"
                icon={Lock}
              />
              <Field
                name="adminDesignation"
                label="Designation"
                placeholder="e.g. Admin, Sales Head"
                icon={Briefcase}
                defaultValue="Admin"
              />
            </div>

            {/* Email notice */}
            <div className="flex items-start gap-2 mt-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5">
              <Mail size={13} className="text-zinc-500 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                A welcome email with login credentials will be sent to the
                admin's email address automatically after account creation.
              </p>
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

// ── Reusable field component ──
function Field({
  name,
  label,
  type = 'text',
  placeholder,
  icon: Icon,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  icon: React.ElementType;
  defaultValue?: string;
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
          defaultValue={defaultValue}
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-rose-600/60 focus:ring-1 focus:ring-rose-600/30 transition-colors"
        />
      </div>
    </div>
  );
}
