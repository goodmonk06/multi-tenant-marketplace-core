'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listings, cart } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { ShoppingCart, Store } from 'lucide-react';

export default function ListingDetailPage({
  params
}: {
  params: { tenantSlug: string; id: string }
}) {
  const [listing, setListing] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadListing() {
      try {
        const data = await listings.getById(params.tenantSlug, params.id);
        setListing(data);
      } catch (error) {
        console.error('Error loading listing:', error);
      } finally {
        setLoading(false);
      }
    }
    loadListing();
  }, [params.tenantSlug, params.id]);

  const handleAddToCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/${params.tenantSlug}/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setAddingToCart(true);
    try {
      await cart.addItem(params.tenantSlug, token, {
        listingId: params.id,
        quantity,
      });
      alert('Added to cart!');
      router.push(`/${params.tenantSlug}/cart`);
    } catch (error: any) {
      alert(error.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Product not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{listing.title}</CardTitle>
            {listing.shop && (
              <CardDescription className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4" />
                {listing.shop.name}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <p className="text-4xl font-bold text-primary">
                  {formatPrice(listing.price, listing.currency)}
                </p>
              </div>

              {listing.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-700">{listing.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <span className="capitalize">{listing.status.toLowerCase()}</span>
                </div>
                {listing.stockQty !== null && (
                  <div>
                    <span className="font-semibold">Stock:</span>{' '}
                    {listing.stockQty} available
                  </div>
                )}
              </div>

              {listing.attributesJson && (
                <div>
                  <h3 className="font-semibold mb-2">Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm">{JSON.stringify(listing.attributesJson, null, 2)}</pre>
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <label className="font-semibold">Quantity:</label>
                  <Input
                    type="number"
                    min="1"
                    max={listing.stockQty || 999}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={addingToCart || listing.status !== 'ACTIVE'}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
