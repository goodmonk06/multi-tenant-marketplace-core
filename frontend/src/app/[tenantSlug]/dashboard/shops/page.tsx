'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shops } from '@/lib/api';
import { Plus, Store } from 'lucide-react';

export default function ShopsPage({ params }: { params: { tenantSlug: string } }) {
  const [shopsList, setShopsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const router = useRouter();

  const loadShops = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/${params.tenantSlug}/auth/login`);
      return;
    }

    try {
      const data = await shops.getMyShops(params.tenantSlug, token);
      setShopsList(data);
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, [params.tenantSlug]);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token')!;
    setCreating(true);

    try {
      await shops.create(params.tenantSlug, token, formData);
      setFormData({ name: '', description: '' });
      setShowForm(false);
      loadShops();
    } catch (error: any) {
      alert(error.message || 'Failed to create shop');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Loading shops...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">My Shops</h1>
        <div className="flex gap-2">
          <Link href={`/${params.tenantSlug}/dashboard`}>
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            New Shop
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Shop</CardTitle>
            <CardDescription>Set up your new marketplace shop</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateShop} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Shop Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Shop"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell customers about your shop..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Shop'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {shopsList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Store className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No shops yet</h2>
            <p className="text-gray-600 mb-6">Create your first shop to start selling!</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Shop
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shopsList.map((shop) => (
            <Card key={shop.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{shop.name}</CardTitle>
                <CardDescription>{shop.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm mb-4">
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <span className="capitalize">{shop.status.toLowerCase()}</span>
                  </p>
                  <p>
                    <span className="font-medium">Listings:</span>{' '}
                    {shop._count?.listings || 0}
                  </p>
                </div>
                <Link href={`/${params.tenantSlug}/dashboard/shops/${shop.id}`}>
                  <Button variant="outline" className="w-full">
                    Manage Shop
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
