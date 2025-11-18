'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/api';

export default function LoginPage({ params }: { params: { tenantSlug: string } }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await auth.login(params.tenantSlug, { email, password });
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      const redirect = searchParams.get('redirect') || `/${params.tenantSlug}`;
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              <p className="text-sm text-center text-gray-600">
                Don't have an account?{' '}
                <Link href={`/${params.tenantSlug}/auth/register`} className="text-primary hover:underline">
                  Register
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
          <p className="font-semibold mb-2">Demo credentials:</p>
          <p>Admin: admin@demo.com / password123</p>
          <p>Seller: seller1@demo.com / password123</p>
          <p>Buyer: buyer@demo.com / password123</p>
        </div>
      </div>
    </div>
  );
}
