// teleCRM/app/set-password/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function SetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('otp_email');
    const storedOtp = sessionStorage.getItem('otp_code');
    if (!storedEmail || !storedOtp) {
      router.replace('/email-verify');
      return;
    }
    setEmail(storedEmail);
    setOtp(storedOtp);
  }, [router]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/set-password', {
        email,
        otp,
        newPassword: password,
      });
      sessionStorage.removeItem('otp_email');
      sessionStorage.removeItem('otp_code');
      router.push('/login?passwordSet=true');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Set your password</CardTitle>
          <CardDescription className="text-zinc-400">
            Choose a strong password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-800/50 rounded-md px-3 py-2 mb-4">
              {error}
            </p>
          )}
          <form onSubmit={handleSetPassword} className="space-y-4">
            {/* New password */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10 placeholder:text-zinc-500"
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

            {/* Confirm password */}
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10 placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= (i + 1) * 3
                        ? password.length >= 12
                          ? 'bg-green-500'
                          : password.length >= 8
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Set Password & Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}