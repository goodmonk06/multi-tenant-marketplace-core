'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shops, listings } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Plus, Package } from 'lucide-react';

export default function ListingsManagementPage({ params }: { params: { tenantSlug: string } }) {
  const [listingsList, setListingsList] = useState<any[]>([]);
  const [shopsList, setShopsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    shopId: '',
    title: '',
    description: '',
    price: '',
    stockQty: '',
  });
  const router = useRouter();

  const loadData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/${params.tenantSlug}/auth/login`);
      return;
    }

    try {
      const [shopsData, listingsData] = await Promise.all([
        shops.getMyShops(params.tenantSlug, token),
        listings.getAll(params.tenantSlug, {}),
      ]);
      setShopsList(shopsData);

      // Filter listings to only show those from user's shops
      const myShopIds = shopsData.map((s: any) => s.id);
      const myListings = listingsData.filter((l: any) => myShopIds.includes(l.shopId));
      setListingsList(myListings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.tenantSlug]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token')!;
    setCreating(true);

    try {
      await listings.create(params.tenantSlug, token, {
        ...formData,
        price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
        stockQty: formData.stockQty ? parseInt(formData.stockQty) : null,
      });
      setFormData({ shopId: '', title: '', description: '', price: '', stockQty: '' });
      setShowForm(false);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to create listing');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">My Listings</h1>
        <div className="flex gap-2">
          <Link href={`/${params.tenantSlug}/dashboard`}>
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          {shopsList.length > 0 && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" />
              New Listing
            </Button>
          )}
        </div>
      </div>

      {shopsList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No shops yet</h2>
            <p className="text-gray-600 mb-6">
              You need to create a shop before adding listings
            </p>
            <Link href={`/${params.tenantSlug}/dashboard/shops`}>
              <Button>Create a Shop</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Create New Listing</CardTitle>
                <CardDescription>Add a new product to your shop</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateListing} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Shop</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={formData.shopId}
                      onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                      required
                    >
                      <option value="">Select a shop</option>
                      {shopsList.map((shop) => (
                        <option key={shop.id} value={shop.id}>
                          {shop.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Product name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your product..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Price (USD)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="9.99"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Stock Quantity</label>
                      <Input
                        type="number"
                        value={formData.stockQty}
                        onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })}
                        placeholder="Leave empty for unlimited"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Listing'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {listingsList.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No listings yet</h2>
                <p className="text-gray-600 mb-6">Create your first product listing!</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Listing
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listingsList.map((listing) => (
                <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-1">{listing.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {listing.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(listing.price, listing.currency)}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <span className="capitalize">{listing.status.toLowerCase()}</span>
                      </p>
                      {listing.stockQty !== null && (
                        <p>
                          <span className="font-medium">Stock:</span> {listing.stockQty}
                        </p>
                      )}
                    </div>
                    <Link href={`/${params.tenantSlug}/listings/${listing.id}`}>
                      <Button variant="outline" className="w-full">
                        View Listing
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
