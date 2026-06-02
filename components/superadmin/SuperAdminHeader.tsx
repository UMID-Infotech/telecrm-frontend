//teleCRM/components/superadmin/SuperAdminHeader.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Shield, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import SuperAdminMobileMenu from './SuperAdminMobileMenu';
import { api } from '@/lib/api';
import { clearAuth } from '@/lib/auth';

interface MeResponse {
  user: {
    id: string;
    email: string;
    accessLevel: string;
    isSuperAdmin: boolean;
  };
}

export default function SuperAdminHeader() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    api
      .get<MeResponse>('/auth/me')
      .then((res) => {
        if (!res.data.user.isSuperAdmin) {
          clearAuth();
          router.push('/login');
        }
        setUserEmail(res.data.user.email);
      })
      .catch(() => {
        clearAuth();
        router.push('/login');
      });
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800 text-white flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu size={18} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 bg-zinc-950 border-zinc-800 w-64"
          >
            <SuperAdminMobileMenu />
          </SheetContent>
        </Sheet>

        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-rose-600 flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-wide">
            Super Admin
          </span>
          <span className="hidden md:inline-block text-[10px] font-medium bg-rose-600/20 text-rose-400 border border-rose-600/30 px-2 py-0.5 rounded-full">
            Platform Control
          </span>
        </div>
      </div>

      {/* Right side */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2 text-sm"
          >
            <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-white text-xs font-bold">
              {userEmail ? userEmail[0].toUpperCase() : 'S'}
            </div>
            <span className="hidden sm:inline">
              {userEmail
                ? `${userEmail.slice(0, 18)}${userEmail.length > 18 ? '…' : ''}`
                : 'Loading…'}
            </span>
            <ChevronDown size={14} className="text-zinc-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-zinc-900 border-zinc-700 text-zinc-200"
        >
          <div className="px-3 py-2">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="text-xs font-medium text-white truncate">
              {userEmail}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-zinc-700" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-rose-400 focus:text-rose-300 focus:bg-zinc-800 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
