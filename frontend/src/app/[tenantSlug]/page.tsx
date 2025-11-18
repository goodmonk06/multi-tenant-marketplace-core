'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { shops, listings } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Store, Package } from 'lucide-react';

export default function TenantHome({ params }: { params: { tenantSlug: string } }) {
  const [shopList, setShopList] = useState<any[]>([]);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [shopsData, listingsData] = await Promise.all([
          shops.getAll(params.tenantSlug),
          listings.getAll(params.tenantSlug, { status: 'ACTIVE' }),
        ]);
        setShopList(shopsData);
        setFeaturedListings(listingsData.slice(0, 6));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.tenantSlug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Welcome to {params.tenantSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover amazing products from local sellers
          </p>
          <Link href={`/${params.tenantSlug}/listings`}>
            <Button size="lg">Browse All Products</Button>
          </Link>
        </div>

        {/* Featured Shops */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-semibold flex items-center gap-2">
              <Store className="h-8 w-8 text-primary" />
              Featured Shops
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shopList.map((shop) => (
              <Card key={shop.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{shop.name}</CardTitle>
                  <CardDescription>{shop.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/${params.tenantSlug}/shops/${shop.id}`}>
                    <Button variant="outline" className="w-full">
                      Visit Shop
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-semibold flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Featured Products
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredListings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{listing.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {listing.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(listing.price, listing.currency)}
                    </span>
                    {listing.stockQty !== null && (
                      <span className="text-sm text-gray-500">
                        {listing.stockQty} in stock
                      </span>
                    )}
                  </div>
                  <Link href={`/${params.tenantSlug}/listings/${listing.id}`}>
                    <Button className="w-full">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
