//app/login/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const formData = new FormData(e.currentTarget);

      const res = await api.post('/auth/login', {
        email: formData.get('email'),
        password: formData.get('password'),
      });

      const { accessToken, accessLevel } = res.data;
      saveAuth(accessToken, accessLevel);

      if (accessLevel === 'L1') router.push('/admin');
      if (accessLevel === 'L2') router.push('/manager');
      if (accessLevel === 'L3') router.push('/agent');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input name="email" placeholder="Email" required />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              required
            />
            <Button className="w-full">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
