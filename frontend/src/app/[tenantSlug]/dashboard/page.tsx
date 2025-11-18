'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Package, ShoppingCart, LogOut } from 'lucide-react';

export default function DashboardPage({ params }: { params: { tenantSlug: string } }) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push(`/${params.tenantSlug}/auth/login?redirect=/${params.tenantSlug}/dashboard`);
      return;
    }

    setUser(JSON.parse(userData));
  }, [params.tenantSlug, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push(`/${params.tenantSlug}`);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    );
  }

  const isSeller = user.role === 'SELLER' || user.role === 'TENANT_ADMIN';
  const isAdmin = user.role === 'TENANT_ADMIN';

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user.email}
          </p>
          <p className="text-sm text-gray-500 capitalize">
            Role: {user.role.replace('_', ' ').toLowerCase()}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* My Orders */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              My Orders
            </CardTitle>
            <CardDescription>
              View and track your orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${params.tenantSlug}/dashboard/orders`}>
              <Button className="w-full">View Orders</Button>
            </Link>
          </CardContent>
        </Card>

        {/* My Shops - Sellers only */}
        {isSeller && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                My Shops
              </CardTitle>
              <CardDescription>
                Manage your shops and storefronts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/${params.tenantSlug}/dashboard/shops`}>
                <Button className="w-full">Manage Shops</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* My Listings - Sellers only */}
        {isSeller && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                My Listings
              </CardTitle>
              <CardDescription>
                Manage your product listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/${params.tenantSlug}/dashboard/listings`}>
                <Button className="w-full">Manage Listings</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {isAdmin && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Admin Tools</h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">
                As a tenant admin, you have access to all shops, listings, and orders in this marketplace.
              </p>
              <div className="flex gap-4">
                <Link href={`/${params.tenantSlug}/dashboard/shops`}>
                  <Button variant="outline">All Shops</Button>
                </Link>
                <Link href={`/${params.tenantSlug}/dashboard/listings`}>
                  <Button variant="outline">All Listings</Button>
                </Link>
                <Link href={`/${params.tenantSlug}/dashboard/orders`}>
                  <Button variant="outline">All Orders</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
