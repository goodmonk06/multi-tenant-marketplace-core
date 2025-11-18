'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listings } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export default function ListingsPage({ params }: { params: { tenantSlug: string } }) {
  const [listingsList, setListingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadListings() {
      try {
        const data = await listings.getAll(params.tenantSlug, { status: 'ACTIVE' });
        setListingsList(data);
      } catch (error) {
        console.error('Error loading listings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, [params.tenantSlug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">All Products</h1>

      {listingsList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products available at the moment.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listingsList.map((listing) => (
            <Card key={listing.id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg line-clamp-1">{listing.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {listing.description || 'No description available'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-primary mb-2">
                    {formatPrice(listing.price, listing.currency)}
                  </div>
                  {listing.shop && (
                    <p className="text-sm text-gray-500">
                      by {listing.shop.name}
                    </p>
                  )}
                  {listing.stockQty !== null && (
                    <p className="text-sm text-gray-500">
                      {listing.stockQty} in stock
                    </p>
                  )}
                </div>
                <Link href={`/${params.tenantSlug}/listings/${listing.id}`}>
                  <Button className="w-full">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
