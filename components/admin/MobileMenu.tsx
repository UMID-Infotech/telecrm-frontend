//teleCRM/telecrm-frontend/components/admin/MobileMenu.tsx
import { LayoutDashboard } from "lucide-react";

export default function MobileMenu() {
  return (
    <div className="bg-slate-900 text-white">
      <div className="p-4 font-semibold text-lg border-b border-slate-700">
        Menu
      </div>

      <nav className="p-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-slate-800">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>
      </nav>
    </div>
  );
}
