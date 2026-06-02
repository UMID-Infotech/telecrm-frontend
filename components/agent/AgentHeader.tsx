// teleCRM/components/agent/AgentHeader.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, User, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import MobileMenu from "./MobileMenu";
import { api } from "@/lib/api";
import { clearAuth } from "@/lib/auth";

interface MeResponse {
  user: { id: string; email: string; accessLevel: string };
}

export default function AgentHeader() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    api
      .get<MeResponse>("/auth/me")
      .then((res) => setUserEmail(res.data.user.email))
      .catch(() => {
        clearAuth();
        router.push("/login");
      });
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const displayEmail = userEmail ? `${userEmail.split("@")[0]}` : "Loading…";

  return (
    <header className="h-14 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center px-4 justify-between">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-white">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="p-0">
            <MobileMenu />
          </SheetContent>
        </Sheet>
        <h1 className="font-semibold text-lg">TeleCRM · Agent</h1>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-white gap-2">
            <User size={16} />
            {displayEmail}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
