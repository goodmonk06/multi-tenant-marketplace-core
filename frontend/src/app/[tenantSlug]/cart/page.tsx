'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cart, orders } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Trash2, ShoppingBag } from 'lucide-react';

export default function CartPage({ params }: { params: { tenantSlug: string } }) {
  const [cartData, setCartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const router = useRouter();

  const loadCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/${params.tenantSlug}/auth/login?redirect=/${params.tenantSlug}/cart`);
      return;
    }

    try {
      const data = await cart.get(params.tenantSlug, token);
      setCartData(data);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [params.tenantSlug]);

  const handleRemoveItem = async (itemId: string) => {
    const token = localStorage.getItem('token')!;
    try {
      await cart.removeItem(params.tenantSlug, token, itemId);
      loadCart();
    } catch (error: any) {
      alert(error.message || 'Failed to remove item');
    }
  };

  const handleCheckout = async () => {
    const token = localStorage.getItem('token')!;
    setCheckingOut(true);

    try {
      const order = await orders.createFromCart(params.tenantSlug, token);
      alert('Order created successfully!');
      router.push(`/${params.tenantSlug}/dashboard/orders`);
    } catch (error: any) {
      alert(error.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Loading cart...</p>
      </div>
    );
  }

  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products to get started!</p>
            <Button onClick={() => router.push(`/${params.tenantSlug}/listings`)}>
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cartData.items.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {item.listing.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      by {item.listing.shop.name}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(item.listing.price, item.listing.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Qty:</span>
                      <span className="font-semibold">{item.quantity}</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-lg">
                <span>Subtotal:</span>
                <span className="font-bold">
                  {formatPrice(cartData.total, cartData.currency)}
                </span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-primary">
                    {formatPrice(cartData.total, cartData.currency)}
                  </span>
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? 'Processing...' : 'Proceed to Checkout'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
