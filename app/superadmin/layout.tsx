// teleCRM/app/superadmin/layout.tsx
import { ReactNode } from "react";
import SuperAdminHeader from "@/components/superadmin/SuperAdminHeader";
import SuperAdminSidebar from "@/components/superadmin/SuperAdminSidebar";
import SuperAdminFooter from "@/components/superadmin/SuperAdminFooter";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      <SuperAdminHeader />

      <div className="flex flex-1 overflow-hidden">
        <SuperAdminSidebar />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>

      <SuperAdminFooter />
    </div>
  );
}