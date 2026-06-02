//teleCRM/app/manager/layout.tsx
import { ReactNode } from 'react';
import ManagerHeader from '@/components/manager/ManagerHeader';
import ManagerSidebar from '@/components/manager/ManagerSidebar';
import ManagerFooter from '@/components/manager/ManagerFooter';

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <ManagerHeader />

      <div className="flex flex-1">
        {/* Sidebar (desktop only) */}
        <ManagerSidebar />

        {/* Main Content */}
        <main className="flex-1 p-4">{children}</main>
      </div>

      <ManagerFooter />
    </div>
  );
}
