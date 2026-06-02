//telecrm/app/admin/layout.tsx
import { ReactNode } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminFooter from '@/components/admin/AdminFooter';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <AdminHeader />

      <div className="flex flex-1">
        {/* Sidebar (desktop only) */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 p-4">{children}</main>
      </div>

      <AdminFooter />
    </div>
  );
}
