# Integration Guide

## Overview

This guide provides step-by-step instructions for integrating with and extending the Multi-Tenant Marketplace platform.

---

## Getting Started

### 1. Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd multi-tenant-marketplace-core

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Start database
cd backend
docker-compose up -d

# Run migrations
npm run prisma:migrate

# Seed database
npm run seed

# Start backend
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Prisma Studio: http://localhost:5555 (run `npm run prisma:studio`)

---

## Creating a New Tenant

### Method 1: CLI Tool

```bash
cd backend

# Basic tenant
npm run cli:provision-tenant -- \
  --name "My Marketplace" \
  --slug "my-marketplace"

# With admin user and sample data
npm run cli:provision-tenant -- \
  --name "My Marketplace" \
  --slug "my-marketplace" \
  --admin-email "admin@mymarketplace.com" \
  --admin-password "secure123" \
  --with-sample-data
```

### Method 2: Programmatically

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tenant = await prisma.tenant.create({
  data: {
    name: 'My Marketplace',
    slug: 'my-marketplace'
  }
});

console.log('Tenant created:', tenant.id);
```

---

## Integrating Payment Providers

### Stripe Integration (Default)

1. **Get Stripe API keys** from https://dashboard.stripe.com/apikeys

2. **Configure environment variables**:
```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

3. **Create payment intent**:
```typescript
// Client-side
const response = await fetch('/payments/create-intent', {
  method: 'POST',
  headers: {
    'X-Tenant-Slug': 'demo-marketplace',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ orderId: 'order-123' })
});

const { clientSecret } = await response.json();

// Use clientSecret with Stripe.js
const stripe = Stripe(publishableKey);
const result = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'Customer Name' }
  }
});
```

### Custom Payment Provider

1. **Implement the adapter interface**:

```typescript
// backend/src/lib/adapters/custom-payment.adapter.ts
import { IPaymentAdapter, PaymentIntent } from './payment.adapter';

export class CustomPaymentAdapter implements IPaymentAdapter {
  async createPaymentIntent(params, tenantId) {
    // Call your payment provider API
    const response = await fetch('https://api.custompay.com/charges', {
      method: 'POST',
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency
      })
    });

    const data = await response.json();

    return {
      id: data.id,
      provider: PaymentProvider.CUSTOM,
      amount: params.amount,
      currency: params.currency,
      status: PaymentStatus.PENDING,
      clientSecret: data.client_secret,
      createdAt: new Date()
    };
  }

  // Implement other required methods...
}
```

2. **Replace the adapter**:

```typescript
// backend/src/lib/adapters/index.ts
import { CustomPaymentAdapter } from './custom-payment.adapter';

export const paymentAdapter: IPaymentAdapter =
  new CustomPaymentAdapter(process.env.CUSTOM_PAY_API_KEY);
```

---

## Setting Up Notifications

### Email with SendGrid

1. **Install SDK**:
```bash
npm install @sendgrid/mail
```

2. **Implement adapter**:

```typescript
// backend/src/lib/adapters/sendgrid-notification.adapter.ts
import sgMail from '@sendgrid/mail';
import { INotificationAdapter, NotificationChannel } from './notification.adapter';

export class SendGridNotificationAdapter implements INotificationAdapter {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(channel, recipient, payload, tenantId) {
    if (channel !== NotificationChannel.EMAIL) {
      throw new Error('Only email supported');
    }

    await sgMail.send({
      to: recipient.email,
      from: 'noreply@mymarketplace.com',
      subject: payload.title,
      text: payload.body,
      html: `<p>${payload.body}</p>`
    });

    return { success: true, messageId: 'sg-...' };
  }

  isChannelEnabled(channel) {
    return channel === NotificationChannel.EMAIL;
  }
}
```

3. **Configure**:

```typescript
// backend/src/lib/adapters/index.ts
export const notificationAdapter: INotificationAdapter =
  new SendGridNotificationAdapter(process.env.SENDGRID_API_KEY);
```

4. **Usage**:

```typescript
import { notificationAdapter } from '../lib/adapters';

await notificationAdapter.send(
  NotificationChannel.EMAIL,
  { userId: user.id, email: user.email },
  {
    title: 'Order Confirmation',
    body: `Your order #${order.id} has been confirmed!`
  },
  tenantId
);
```

---

## Cloud Storage Integration

### AWS S3

1. **Install SDK**:
```bash
npm install @aws-sdk/client-s3
```

2. **Implement adapter**:

```typescript
// backend/src/lib/adapters/s3-storage.adapter.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { IStorageAdapter } from './storage.adapter';

export class S3StorageAdapter implements IStorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor(config: { region: string; bucket: string }) {
    this.client = new S3Client({ region: config.region });
    this.bucket = config.bucket;
  }

  async upload(params, tenantId) {
    const key = `${tenantId}/${params.folder || 'uploads'}/${params.fileName}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: params.file,
      ContentType: params.mimeType,
      ACL: params.isPublic ? 'public-read' : 'private'
    }));

    const url = `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return {
      success: true,
      url,
      key,
      size: params.file.length
    };
  }

  // Implement other methods...
}
```

3. **Configure**:

```typescript
export const storageAdapter: IStorageAdapter =
  new S3StorageAdapter({
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET
  });
```

---

## Analytics Integration

### Google Analytics

1. **Implement adapter**:

```typescript
// backend/src/lib/adapters/ga-analytics.adapter.ts
import { IAnalyticsAdapter } from './analytics.adapter';

export class GoogleAnalyticsAdapter implements IAnalyticsAdapter {
  private measurementId: string;

  constructor(measurementId: string) {
    this.measurementId = measurementId;
  }

  async track(event, tenantId) {
    // Send to GA4 Measurement Protocol
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${process.env.GA_API_SECRET}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: event.userId || event.sessionId,
        events: [{
          name: event.eventType,
          params: event.properties
        }]
      })
    });
  }

  async identify(user, tenantId) {
    // Set user properties
  }

  async pageView(url, userId, properties, tenantId) {
    await this.track({
      eventType: AnalyticsEventType.PAGE_VIEW,
      userId,
      properties: { ...properties, page_location: url }
    }, tenantId);
  }

  async flush() {
    // No-op for GA
  }
}
```

2. **Track events**:

```typescript
import { analyticsAdapter } from '../lib/adapters';

// Track listing view
await analyticsAdapter.track({
  eventType: AnalyticsEventType.LISTING_VIEW,
  userId: user.id,
  properties: {
    listingId: listing.id,
    listingTitle: listing.title,
    price: listing.price
  }
}, tenantId);

// Track purchase
await analyticsAdapter.track({
  eventType: AnalyticsEventType.PURCHASE,
  userId: user.id,
  properties: {
    orderId: order.id,
    value: order.totalPrice / 100,
    currency: order.currency,
    items: order.items.map(i => ({
      item_id: i.listingId,
      item_name: i.listing.title,
      price: i.unitPrice / 100,
      quantity: i.quantity
    }))
  }
}, tenantId);
```

---

## Adding Custom Business Logic

### Event Handlers

Subscribe to domain events to add custom behavior:

```typescript
// backend/src/custom/send-order-email.handler.ts
import { EventHandler, DomainEvent } from '../lib/events/types';
import { DomainEventType } from '../lib/events/types';
import { notificationAdapter } from '../lib/adapters';

export class SendOrderEmailHandler implements EventHandler {
  async handle(event: DomainEvent<OrderCreatedEvent>) {
    const order = await prisma.order.findUnique({
      where: { id: event.data.orderId },
      include: { buyer: true }
    });

    await notificationAdapter.send(
      NotificationChannel.EMAIL,
      {
        userId: order.buyerId,
        email: order.buyer.email
      },
      {
        title: 'Order Confirmation',
        body: `Thank you for your order! Order #${order.id} has been received.`
      },
      event.tenantId
    );
  }
}

// Register handler
eventBus.subscribe(
  DomainEventType.ORDER_CREATED,
  new SendOrderEmailHandler()
);
```

### Custom Middleware

```typescript
// backend/src/middleware/custom-logging.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class CustomLoggingMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });

    next();
  }
}

// Register in app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware, CustomLoggingMiddleware)
      .forRoutes('*');
  }
}
```

---

## Frontend Integration

### Using the API

```typescript
// frontend/lib/api.ts
const API_BASE = 'http://localhost:4000';

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem('auth_token');
  const tenantSlug = localStorage.getItem('tenant_slug') || 'demo-marketplace';

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': tenantSlug,
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// Usage
export async function getListings(params?: SearchParams) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/categories/search?${query}`);
}

export async function createOrder(items: OrderItem[]) {
  return apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}
```

### React Component Example

```typescript
// frontend/components/ListingCard.tsx
'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';

export function ListingCard({ listing }) {
  const [loading, setLoading] = useState(false);

  const addToCart = async () => {
    setLoading(true);
    try {
      await apiRequest('/cart', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          quantity: 1
        })
      });
      alert('Added to cart!');
    } catch (error) {
      alert('Error adding to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold">{listing.title}</h3>
      <p className="text-gray-600">{listing.description}</p>
      <p className="text-lg font-semibold mt-2">
        ${(listing.price / 100).toFixed(2)}
      </p>
      <button
        onClick={addToCart}
        disabled={loading}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  );
}
```

---

## Testing Integrations

### Testing with Mock Adapters

```typescript
// test/orders.e2e.spec.ts
import { Test } from '@nestjs/testing';
import { InMemoryPaymentAdapter } from '../src/lib/adapters/payment.adapter';

describe('Orders E2E', () => {
  let app;
  let paymentAdapter;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider('PaymentAdapter')
      .useValue(new InMemoryPaymentAdapter())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    paymentAdapter = moduleRef.get('PaymentAdapter');
  });

  it('should create order with mock payment', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('X-Tenant-Slug', 'test')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ listingId: 'listing-1', quantity: 1 }] })
      .expect(201);

    expect(response.body.status).toBe('PENDING');
  });
});
```

---

## Production Deployment

### Environment Configuration

```bash
# Production .env
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://user:pass@db.example.com:5432/marketplace

# JWT
JWT_SECRET=<strong-random-secret>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Redis
REDIS_URL=redis://cache.example.com:6379

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=marketplace-uploads

# SendGrid
SENDGRID_API_KEY=SG...

# Google Analytics
GA_MEASUREMENT_ID=G-...
GA_API_SECRET=...
```

### Docker Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.mymarketplace.com

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=marketplace
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Health Monitoring

```typescript
// backend/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('db')
  async checkDatabase() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'database' };
    } catch (error) {
      return { status: 'error', service: 'database', error: error.message };
    }
  }

  @Get('redis')
  async checkRedis() {
    try {
      await redis.ping();
      return { status: 'ok', service: 'redis' };
    } catch (error) {
      return { status: 'error', service: 'redis', error: error.message };
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Tenant not found
```
Error: Tenant not found for slug: my-marketplace
```

**Solution**: Ensure `X-Tenant-Slug` header is set correctly and tenant exists in database.

#### 2. CORS errors
```
Access to fetch blocked by CORS policy
```

**Solution**: Configure CORS in `main.ts`:
```typescript
app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true
});
```

#### 3. Prisma client errors
```
Error: PrismaClient is unable to be run in the browser
```

**Solution**: Ensure Prisma Client is only imported in server-side code (API routes, server components).

---

## Additional Resources

- [API Documentation](./API.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Phase 3 Implementation Plan](./PHASE3_OVERVIEW.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
