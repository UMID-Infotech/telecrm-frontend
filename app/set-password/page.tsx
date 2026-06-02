//teleCRM/app/set-password/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Retrieve email + OTP passed from verify step
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
      // Clean up session storage
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Set your password</CardTitle>
          <CardDescription className="text-zinc-400">
            Choose a strong password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <Input
              type="password"
              placeholder="New password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
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
