import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            Multi-Tenant Marketplace Core
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            A reusable marketplace platform supporting physical goods, services, digital products, and more.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>Demo Marketplace</CardTitle>
                <CardDescription>
                  Explore the demo marketplace with sample shops and products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/demo-marketplace">
                  <Button className="w-full">Visit Demo Marketplace</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  Seller and admin dashboard for managing shops and orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/demo-marketplace/dashboard">
                  <Button variant="outline" className="w-full">Go to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 text-left">
            <h2 className="text-2xl font-semibold mb-4">Features</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">✓</span>
                <span><strong>Multi-tenant architecture</strong> - Each tenant is a separate marketplace brand</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">✓</span>
                <span><strong>Role-based access</strong> - Tenant admins, sellers, and buyers</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">✓</span>
                <span><strong>Flexible product types</strong> - Physical goods, services, digital products, slots, etc.</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">✓</span>
                <span><strong>Seller onboarding</strong> - Create shops and manage listings</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">✓</span>
                <span><strong>Shopping cart & checkout</strong> - Complete buyer flow with Stripe integration</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">✓</span>
                <span><strong>Admin controls</strong> - Manage shops, listings, and orders</span>
              </li>
            </ul>
          </div>

          <div className="mt-12 text-sm text-gray-500">
            <p>Login credentials for demo:</p>
            <p>Admin: admin@demo.com / password123</p>
            <p>Seller: seller1@demo.com / password123</p>
            <p>Buyer: buyer@demo.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
