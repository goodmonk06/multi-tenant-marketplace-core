'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Store, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenantSlug: string };
}) {
  const pathname = usePathname();
  const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('token');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/${params.tenantSlug}`} className="flex items-center space-x-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold capitalize">
                {params.tenantSlug.replace(/-/g, ' ')}
              </span>
            </Link>

            <nav className="flex items-center space-x-6">
              <Link href={`/${params.tenantSlug}`}>
                <Button variant={pathname === `/${params.tenantSlug}` ? 'default' : 'ghost'}>
                  Home
                </Button>
              </Link>
              <Link href={`/${params.tenantSlug}/listings`}>
                <Button variant={pathname?.startsWith(`/${params.tenantSlug}/listings`) ? 'default' : 'ghost'}>
                  Shop
                </Button>
              </Link>

              {isAuthenticated ? (
                <>
                  <Link href={`/${params.tenantSlug}/cart`}>
                    <Button variant="ghost" size="icon">
                      <ShoppingCart className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href={`/${params.tenantSlug}/dashboard`}>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href={`/${params.tenantSlug}/auth/login`}>
                  <Button>Login</Button>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>Multi-Tenant Marketplace Core - A reusable marketplace platform</p>
        </div>
      </footer>
    </div>
  );
}
