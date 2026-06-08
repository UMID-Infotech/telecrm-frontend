// teleCRM/components/agent/MobileMenu.tsx
import Link from "next/link";
import { LayoutDashboard, ClipboardList, PlusCircle } from "lucide-react";

const navItems = [
  { href: "/agent", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  {
    href: "/agent/leads",
    label: "My Leads",
    icon: <ClipboardList size={18} />,
  },
  {
    href: "/leads/create",
    label: "Create Lead",
    icon: <PlusCircle size={18} />,
  },
];

interface MobileMenuProps {
  onNavigate: () => void;
}

export default function MobileMenu({ onNavigate }: MobileMenuProps) {
  return (
    <div className="bg-slate-900 text-white">
      <div className="p-4 font-semibold text-lg border-b border-slate-700">
        TeleCRM · Agent
      </div>
      <nav className="p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors"
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
