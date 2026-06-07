// teleCRM/app/login/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { INACTIVITY_TOAST_KEY } from '@/hooks/useInactivityLogout';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordSet = searchParams.get('passwordSet');
  const passwordReset = searchParams.get('passwordReset');

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(INACTIVITY_TOAST_KEY)) {
      sessionStorage.removeItem(INACTIVITY_TOAST_KEY);
      setTimeout(() => {
        toast.warning('You have been logged out due to inactivity.', {
          duration: 6000,
        });
      }, 100);
    }
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);

      const res = await api.post('/auth/login', {
        email: formData.get('email'),
        password: formData.get('password'),
      });

      const { accessToken, accessLevel, isSuperAdmin } = res.data;
      saveAuth(accessToken, accessLevel);

      if (isSuperAdmin || accessLevel === 'L0') {
        router.push('/superadmin');
      } else if (accessLevel === 'L1') {
        router.push('/admin');
      } else if (accessLevel === 'L2') {
        router.push('/manager');
      } else if (accessLevel === 'L3') {
        router.push('/agent');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Login</CardTitle>
        </CardHeader>

        <CardContent>
          {/* Success banners */}
          {passwordSet && (
            <p className="text-green-400 text-sm bg-green-950/40 border border-green-800/50 rounded-md px-3 py-2 mb-4">
              ✓ Password set successfully! Please login with your new password.
            </p>
          )}
          {passwordReset && (
            <p className="text-green-400 text-sm bg-green-950/40 border border-green-800/50 rounded-md px-3 py-2 mb-4">
              ✓ Password reset successfully! Please login with your new password.
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <Input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />

            {/* Password with eye toggle */}
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-zinc-400 hover:text-red-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button className="w-full bg-red-600 hover:bg-red-700">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}