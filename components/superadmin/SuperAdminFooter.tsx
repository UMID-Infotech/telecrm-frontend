// teleCRM/components/superadmin/SuperAdminFooter.tsx
export default function SuperAdminFooter() {
  return (
    <footer className="h-10 bg-zinc-950 border-t border-zinc-800 flex items-center justify-center shrink-0">
      <p className="text-[11px] text-zinc-600">
        © {new Date().getFullYear()} TeleCRM Platform · Super Admin Console
      </p>
    </footer>
  );
}