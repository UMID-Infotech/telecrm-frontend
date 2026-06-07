//teleCRM/app/email-verify/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function EmailVerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'success'>('form');

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      // Store for next step (set-password page needs it)
      sessionStorage.setItem('otp_email', email);
      sessionStorage.setItem('otp_code', otp);
      router.push('/set-password');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) { setError('Please enter your email first'); return; }
    setResending(true);
    setError('');
    try {
      await api.post('/auth/resend-otp', { email });
      alert('A new OTP has been sent to your email.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Verify your email</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter the 6-digit OTP sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
            <Input
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 tracking-widest text-center text-xl"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full text-sm text-zinc-400 hover:text-zinc-200 underline"
            >
              {resending ? 'Sending...' : "Didn't receive OTP? Resend"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}