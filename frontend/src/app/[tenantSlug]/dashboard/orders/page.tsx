'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { orders } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';

export default function OrdersPage({ params }: { params: { tenantSlug: string } }) {
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadOrders() {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push(`/${params.tenantSlug}/auth/login`);
        return;
      }

      try {
        const data = await orders.getMyOrders(params.tenantSlug, token);
        setOrdersList(data);
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [params.tenantSlug, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">My Orders</h1>
        <Link href={`/${params.tenantSlug}/dashboard`}>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {ordersList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No orders yet</p>
            <Link href={`/${params.tenantSlug}/listings`}>
              <Button>Start Shopping</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordersList.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{order.id.slice(0, 8)}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatPrice(order.totalPrice, order.currency)}
                    </p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'PAYMENT_SUCCEEDED'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'PAYMENT_FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm border-t pt-2"
                    >
                      <span>
                        {item.listing.title} x {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.unitPrice * item.quantity, order.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
