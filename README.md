# Multi-Tenant Marketplace Core

A reusable, production-ready marketplace backend and frontend skeleton that supports:
- **Physical goods** (e.g., farmer's market, artisan crafts)
- **Services** (e.g., consulting, appointments)
- **Digital products** (e.g., courses, downloads)
- **Flexible listings** (e.g., event seats, rental slots, subscription offers)

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  - Tenant-scoped routes (/[tenantSlug]/...)                 │
│  - Marketplace UI (browse, cart, checkout)                  │
│  - Seller Dashboard (manage shops & listings)               │
│  - Admin Dashboard (manage all resources)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (NestJS)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Tenant Middleware (X-Tenant-Slug)           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         JWT Authentication & Authorization          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌──────────────┬──────────────┬──────────────────────┐   │
│  │   Tenants    │    Users     │    Auth Module       │   │
│  ├──────────────┼──────────────┼──────────────────────┤   │
│  │    Shops     │   Listings   │    Cart Module       │   │
│  ├──────────────┼──────────────┼──────────────────────┤   │
│  │   Orders     │   Payments   │   Stripe Integration │   │
│  └──────────────┴──────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Layer (Prisma + PostgreSQL)                │
│  - Multi-tenant data isolation                               │
│  - Optimized indexes for tenant scoping                     │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

#### Backend
- **NestJS** - Scalable Node.js framework with TypeScript
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database
- **Redis** - Caching and session storage
- **Stripe** - Payment processing
- **JWT** - Authentication & authorization
- **bcrypt** - Password hashing

#### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **Lucide Icons** - Icon library

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+ (optional but recommended)
- Stripe account (for payments)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd multi-tenant-marketplace-core
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up the backend**
```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/marketplace"
# JWT_SECRET="your-secret-key"
# STRIPE_SECRET_KEY="sk_test_..."

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database with demo data
npm run seed
```

4. **Set up the frontend**
```bash
cd ../frontend

# Copy environment file
cp .env.example .env

# Edit .env if needed
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

5. **Run the development servers**

From the root directory:
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Demo Marketplace: http://localhost:3000/demo-marketplace

### Demo Credentials

After seeding, you can log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | password123 |
| Seller | seller1@demo.com | password123 |
| Seller | seller2@demo.com | password123 |
| Buyer | buyer@demo.com | password123 |

## 📦 Domain Model

### Core Entities

#### Tenant
Represents a marketplace brand/instance. Each tenant is isolated.
```typescript
{
  id: string
  name: string
  slug: string        // Used in URLs and API headers
  createdAt: DateTime
}
```

#### User
Multi-role user system supporting admins, sellers, and buyers.
```typescript
{
  id: string
  tenantId: string
  email: string
  passwordHash: string
  role: UserRole      // TENANT_ADMIN | SELLER | BUYER
  profileJson: Json   // Flexible metadata
}
```

#### Shop (SellerProfile)
A seller's storefront within a tenant.
```typescript
{
  id: string
  tenantId: string
  ownerUserId: string
  name: string
  description: string
  status: ShopStatus  // PENDING | ACTIVE | SUSPENDED | CLOSED
}
```

#### Listing
A product/service/offering for sale.
```typescript
{
  id: string
  tenantId: string
  shopId: string
  title: string
  description: string
  status: ListingStatus  // DRAFT | ACTIVE | INACTIVE | SOLD_OUT
  price: number          // in cents
  currency: string
  stockQty: number       // null = unlimited
  attributesJson: Json   // Flexible product attributes
}
```

#### Order
A buyer's purchase.
```typescript
{
  id: string
  tenantId: string
  buyerId: string
  totalPrice: number
  currency: string
  status: OrderStatus
  paymentProvider: string
  paymentIntentId: string
  items: OrderItem[]
}
```

## 🔐 Multi-Tenant Architecture

### How Tenancy Works

1. **Tenant Identification**: Every API request must include the `X-Tenant-Slug` header
2. **Middleware Validation**: The TenantMiddleware validates the slug and attaches tenant context
3. **Data Scoping**: All queries automatically filter by `tenantId`
4. **URL Structure**: Frontend routes use `/[tenantSlug]/...` pattern

### Example API Request

```bash
curl -X GET http://localhost:3001/listings \
  -H "X-Tenant-Slug: demo-marketplace" \
  -H "Authorization: Bearer <token>"
```

### Creating a New Tenant

```bash
curl -X POST http://localhost:3001/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Marketplace",
    "slug": "my-marketplace"
  }'
```

## 🛒 Key Workflows

### Seller Onboarding Flow

1. User registers with `SELLER` role
2. Seller creates a Shop via `/shops` API
3. Shop is created with `ACTIVE` status
4. Seller adds Listings to their Shop
5. Listings become visible in marketplace

### Buyer Purchase Flow

1. Buyer browses listings at `/[tenant]/listings`
2. Adds items to cart
3. Proceeds to checkout
4. Order is created with `PENDING` status
5. Stripe PaymentIntent is created
6. On payment success, webhook updates order to `PAYMENT_SUCCEEDED`
7. Stock is decremented automatically

### Payment Processing

```typescript
// 1. Create order from cart
POST /orders/from-cart

// 2. Create Stripe payment intent
POST /payments/create-intent
{ "orderId": "..." }

// 3. Frontend uses Stripe.js to collect payment
// 4. Stripe webhook confirms payment
POST /payments/webhook
```

## 🎨 Customization Examples

### Example: Farmer-to-Consumer Marketplace

To adapt this for a local farm marketplace:

1. **Update Tenant Branding**
```typescript
// In backend/prisma/seed.ts
await prisma.tenant.create({
  name: "Farm Fresh Market",
  slug: "farm-fresh"
});
```

2. **Customize Listing Attributes**
```typescript
// When creating a listing for produce
{
  title: "Organic Tomatoes",
  attributesJson: {
    type: "produce",
    organic: true,
    weight: "1 lb",
    harvestDate: "2024-01-15"
  }
}
```

3. **Extend the Schema**
```prisma
// Add to backend/prisma/schema.prisma
model Listing {
  // ... existing fields
  harvestDate  DateTime?
  farmLocation String?
}
```

4. **Customize Frontend**
- Update `frontend/src/app/[tenantSlug]/page.tsx` with farm-specific hero
- Add filtering by product type, organic status, etc.
- Show farm location and harvest dates

### Example: Service Marketplace

For a consultant booking platform:

1. **Listing represents a service offering**
```typescript
{
  title: "Business Strategy Consultation",
  attributesJson: {
    type: "service",
    duration: "60 minutes",
    deliveryMethod: "video-call",
    expertise: ["strategy", "growth"]
  },
  stockQty: null  // Unlimited bookings
}
```

2. **Extend with booking slots**
```prisma
model TimeSlot {
  id        String   @id @default(cuid())
  listingId String
  startTime DateTime
  endTime   DateTime
  isBooked  Boolean  @default(false)
  listing   Listing  @relation(fields: [listingId], references: [id])
}
```

### Example: Digital Products

For selling courses or downloads:

1. **Add download tracking**
```prisma
model Download {
  id        String   @id @default(cuid())
  orderId   String
  listingId String
  userId    String
  fileUrl   String
  downloadedAt DateTime?
}
```

2. **Listing for digital product**
```typescript
{
  title: "Complete Web Development Course",
  attributesJson: {
    type: "digital-product",
    format: "video",
    duration: "40 hours",
    fileSize: "15GB",
    accessType: "lifetime"
  },
  stockQty: null  // Unlimited digital copies
}
```

## 📁 Project Structure

```
multi-tenant-marketplace-core/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Demo data seed script
│   ├── src/
│   │   ├── auth/               # Authentication & JWT
│   │   ├── cart/               # Shopping cart
│   │   ├── listings/           # Product listings
│   │   ├── orders/             # Order management
│   │   ├── payments/           # Stripe integration
│   │   ├── prisma/             # Prisma service
│   │   ├── shops/              # Shop management
│   │   ├── tenant/             # Multi-tenant middleware
│   │   ├── users/              # User management
│   │   ├── app.module.ts       # Main app module
│   │   └── main.ts             # Application entry
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── [tenantSlug]/   # Tenant-scoped routes
│   │   │   │   ├── auth/       # Login/Register
│   │   │   │   ├── cart/       # Shopping cart
│   │   │   │   ├── dashboard/  # Seller/Admin dashboard
│   │   │   │   ├── listings/   # Product browsing
│   │   │   │   └── page.tsx    # Marketplace home
│   │   │   └── page.tsx        # Landing page
│   │   ├── components/ui/      # Reusable UI components
│   │   └── lib/
│   │       ├── api.ts          # API client functions
│   │       └── utils.ts        # Utility functions
│   └── package.json
└── package.json                # Root workspace config
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Shops
- `GET /shops` - List all shops (public)
- `GET /shops/my-shops` - Get current user's shops
- `GET /shops/:id` - Get shop details
- `POST /shops` - Create shop (seller/admin)
- `PATCH /shops/:id` - Update shop
- `PATCH /shops/:id/status` - Update shop status (admin)

### Listings
- `GET /listings` - List all active listings (public)
- `GET /listings/:id` - Get listing details (public)
- `POST /listings` - Create listing (seller/admin)
- `PATCH /listings/:id` - Update listing
- `PATCH /listings/:id/status` - Update listing status

### Cart
- `GET /cart` - Get current user's cart
- `POST /cart/items` - Add item to cart
- `PATCH /cart/items/:id` - Update cart item quantity
- `DELETE /cart/items/:id` - Remove cart item
- `DELETE /cart` - Clear cart

### Orders
- `GET /orders` - List orders
- `GET /orders/my-orders` - Get current user's orders
- `GET /orders/:id` - Get order details
- `POST /orders` - Create order
- `POST /orders/from-cart` - Create order from cart
- `PATCH /orders/:id/status` - Update order status (admin/seller)

### Payments
- `POST /payments/create-intent` - Create Stripe payment intent
- `POST /payments/webhook` - Stripe webhook handler

## 🧪 Testing the Application

### Manual Testing Flow

1. **Access the demo marketplace**
   - Navigate to http://localhost:3000/demo-marketplace

2. **Browse as a guest**
   - View shops and listings without logging in

3. **Login as buyer**
   - Email: buyer@demo.com / Password: password123
   - Add items to cart
   - Proceed through checkout (creates order)

4. **Login as seller**
   - Email: seller1@demo.com / Password: password123
   - Create a new shop
   - Add product listings
   - View orders

5. **Login as admin**
   - Email: admin@demo.com / Password: password123
   - View all shops, listings, and orders
   - Update listing statuses

## 🚢 Deployment Considerations

### Environment Variables

**Backend (.env)**
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=strong-random-secret
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3001
```

**Frontend (.env)**
```bash
NEXT_PUBLIC_API_URL=https://api.yourmarketplace.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Production Checklist

- [ ] Use strong JWT_SECRET
- [ ] Configure CORS properly
- [ ] Enable HTTPS/SSL
- [ ] Set up Stripe webhooks in production mode
- [ ] Configure database connection pooling
- [ ] Set up Redis for caching
- [ ] Implement rate limiting
- [ ] Add monitoring and logging
- [ ] Set up automated backups
- [ ] Configure email notifications
- [ ] Implement file upload for product images

## 🤝 Contributing

This is a core skeleton meant to be customized. Feel free to:
- Extend the domain model
- Add new features
- Customize the UI
- Adapt for your specific marketplace type

## 📄 License

MIT License - Feel free to use this for your own marketplace projects!

## 🙏 Acknowledgments

Built with modern, production-ready technologies to provide a solid foundation for any marketplace application.
