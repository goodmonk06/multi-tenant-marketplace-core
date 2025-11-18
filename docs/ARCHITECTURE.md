# Architecture Documentation

## Overview

The Multi-Tenant Marketplace is built with a **layered architecture** following **Domain-Driven Design (DDD)** principles. The system supports complete data isolation between tenants while maintaining a single codebase.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│          React Components + Server Components            │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────┴────────────────────────────────────┐
│                   API Gateway Layer                      │
│              (NestJS Controllers + Guards)               │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Tenant Middleware (X-Tenant-Slug)         │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                  Application Layer                       │
│        (Services, DTOs, Business Logic)                  │
│  ┌────────────────────────────────────────────────┐     │
│  │  Event Bus  │  Logging  │  Metrics  │ Adapters │     │
│  └────────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                   Domain Layer                           │
│     (Entities, Value Objects, Domain Events)             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│              Infrastructure Layer                        │
│  ┌─────────────┬──────────────┬─────────────────────┐  │
│  │   Prisma    │   Stripe     │   Redis / Adapters  │  │
│  │  (Database) │  (Payments)  │   (Cache / Queue)   │  │
│  └─────────────┴──────────────┴─────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │   PostgreSQL    │
            └─────────────────┘
```

## Core Concepts

### Multi-Tenancy

**Strategy**: Row-level multi-tenancy with discriminator column (`tenantId`)

**Benefits**:
- Single database for all tenants
- Cost-effective scaling
- Easier maintenance and updates
- Shared infrastructure

**Implementation**:
1. Every database table includes a `tenantId` column
2. Middleware extracts tenant from `X-Tenant-Slug` header
3. All queries automatically filtered by `tenantId`
4. Complete data isolation at application level

```typescript
// Middleware injects tenantId into request
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: () => void) {
    const tenantSlug = req.headers['x-tenant-slug'];
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });
    req.tenantId = tenant.id;
    next();
  }
}

// All queries scoped to tenant
async getListings(tenantId: string) {
  return prisma.listing.findMany({
    where: { tenantId } // Automatic filtering
  });
}
```

### Layered Architecture

#### 1. Presentation Layer (Controllers)

**Responsibilities**:
- HTTP request/response handling
- Input validation (DTOs with class-validator)
- Authentication/authorization guards
- Tenant context injection

```typescript
@Controller('listings')
export class ListingsController {
  @Get()
  async getListings(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any
  ) {
    return this.listingsService.getListings(req.tenantId);
  }
}
```

#### 2. Application Layer (Services)

**Responsibilities**:
- Business logic orchestration
- Transaction management
- Domain event publishing
- Logging and metrics

```typescript
@Injectable()
export class OrdersService {
  async createOrder(tenantId: string, dto: CreateOrderDto) {
    // 1. Validate business rules
    // 2. Create order
    const order = await this.prisma.order.create({...});

    // 3. Publish domain event
    await eventBus.publish(
      DomainEventType.ORDER_CREATED,
      tenantId,
      { orderId: order.id }
    );

    // 4. Record metrics
    metrics.incrementOrderCount(tenantId, order.status);

    return order;
  }
}
```

#### 3. Domain Layer

**Responsibilities**:
- Core business entities
- Domain events
- Business rules and invariants

**Key Entities**:
- `Tenant` - Marketplace instance
- `User` - Buyer, Seller, or Admin
- `Shop` - Seller's storefront
- `Listing` - Product for sale
- `Order` - Purchase transaction
- `Review` - Product rating/feedback
- `Category` - Product taxonomy

#### 4. Infrastructure Layer

**Responsibilities**:
- Database access (Prisma ORM)
- External service integrations (Stripe, Redis)
- Adapter implementations

---

## Domain Model

```
┌──────────┐        ┌─────────┐
│  Tenant  │◄───────┤  User   │
└────┬─────┘        └─────┬───┘
     │                    │
     │ 1:N                │ 1:N
     │                    │
     ▼                    ▼
┌─────────┐         ┌──────────┐
│Category │         │   Shop   │
└─────────┘         └────┬─────┘
     │                   │
     │ M:N               │ 1:N
     │                   │
     ▼                   ▼
┌──────────┐       ┌───────────┐
│ Listing  │◄──────┤ListingCat.│
└────┬─────┘       └───────────┘
     │
     │ 1:N
     │
     ▼
┌──────────┐       ┌──────────┐
│OrderItem │──────►│  Order   │
└──────────┘       └────┬─────┘
                        │
                        │ 1:N
                        │
                        ▼
                   ┌─────────┐
                   │ Review  │
                   └─────────┘
```

### Relationships

- **Tenant** → Users, Shops, Listings, Orders (1:N)
- **User** → Orders (as buyer), Shops (as seller), Reviews (1:N)
- **Shop** → Listings (1:N)
- **Listing** → Categories (M:N via ListingCategory)
- **Order** → OrderItems → Listings (1:N:1)
- **Listing** → Reviews (1:N)

---

## Design Patterns

### 1. Repository Pattern

Abstracted via Prisma ORM. All data access goes through Prisma Client:

```typescript
@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaClient) {}

  async findAll(tenantId: string) {
    return this.prisma.listing.findMany({
      where: { tenantId }
    });
  }
}
```

### 2. Adapter Pattern

Used for external integrations, allowing easy swapping:

```typescript
// Interface
interface IPaymentAdapter {
  createPaymentIntent(...): Promise<PaymentIntent>;
  refund(...): Promise<RefundResult>;
}

// Implementations
class StripePaymentAdapter implements IPaymentAdapter {...}
class InMemoryPaymentAdapter implements IPaymentAdapter {...}

// Usage
const paymentAdapter: IPaymentAdapter =
  process.env.NODE_ENV === 'production'
    ? new StripePaymentAdapter()
    : new InMemoryPaymentAdapter();
```

### 3. Event-Driven Architecture

Domain events decouple business logic:

```typescript
// Publish event
await eventBus.publish(
  DomainEventType.ORDER_CREATED,
  tenantId,
  { orderId: order.id }
);

// Subscribe to event
eventBus.subscribe(
  DomainEventType.ORDER_CREATED,
  new SendOrderConfirmationHandler()
);
```

### 4. Middleware Pattern

Request processing pipeline:

```
Request → TenantMiddleware → AuthGuard → Controller → Service
```

---

## Infrastructure

### Database (PostgreSQL + Prisma)

**Schema**:
- 15+ tables with proper indexing
- Foreign key constraints for referential integrity
- Cascade deletes for tenant data cleanup
- JSON columns for flexible attributes

**Key Indexes**:
```prisma
model Listing {
  @@index([tenantId])        // Tenant isolation
  @@index([shopId])          // Shop queries
  @@index([status])          // Status filtering
  @@index([price])           // Price sorting
}
```

**Migrations**:
```bash
npm run prisma:migrate    # Create and apply migration
npm run prisma:generate   # Generate Prisma Client
npm run prisma:studio     # Visual database browser
```

### Caching (Redis)

**Use Cases**:
- Session storage
- Cart data (ephemeral)
- Frequently accessed listings
- Rate limiting counters

**Implementation**:
```typescript
const redis = new Redis(process.env.REDIS_URL);

// Cache listing
await redis.setex(`listing:${id}`, 3600, JSON.stringify(listing));

// Get from cache
const cached = await redis.get(`listing:${id}`);
```

### File Storage

**Adapter-based approach**:
- Development: Local filesystem
- Production: S3, Google Cloud Storage, or Azure Blob

```typescript
// Upload image
const result = await storageAdapter.upload({
  file: buffer,
  fileName: 'product.jpg',
  mimeType: 'image/jpeg',
  folder: `${tenantId}/products`
});
```

---

## Security

### Authentication

**Strategy**: JWT (JSON Web Tokens)

```typescript
// Generate token
const token = jwt.sign(
  { userId: user.id, tenantId: user.tenantId, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Verify token
@UseGuards(JwtAuthGuard)
async getProfile(@Request() req) {
  return req.user; // From JWT payload
}
```

### Authorization

**Role-Based Access Control (RBAC)**:
- `TENANT_ADMIN` - Full control within tenant
- `SELLER` - Manage own shops and listings
- `BUYER` - Place orders, write reviews

```typescript
// Guard implementation
@Injectable()
export class RolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check role
    if (user.role !== 'TENANT_ADMIN') {
      throw new ForbiddenException();
    }

    return true;
  }
}
```

### Data Isolation

**Tenant Separation**:
- All queries filtered by `tenantId`
- Row-Level Security (RLS) at application level
- No cross-tenant data leakage

**Validation**:
```typescript
// Ensure resource belongs to tenant
const listing = await prisma.listing.findFirst({
  where: {
    id: listingId,
    tenantId: req.tenantId // Critical check
  }
});
```

---

## Observability

### Logging

**Structured JSON logs** with context:

```typescript
logger.info('Order created', {
  orderId: order.id,
  tenantId,
  userId,
  totalPrice: order.totalPrice,
  correlationId: req.correlationId
});
```

**Log Levels**:
- `ERROR` - Application errors
- `WARN` - Warnings, deprecations
- `INFO` - Important events
- `DEBUG` - Detailed debug info

### Metrics

**Key Metrics**:
- `orders_total{tenantId, status}` - Order count by status
- `order_value{tenantId}` - Order values histogram
- `api_latency_ms{endpoint, method}` - API response times
- `listing_views_total{tenantId, listingId}` - View counts

**Collection**:
```typescript
metrics.incrementOrderCount(tenantId, 'COMPLETED');
metrics.recordOrderValue(tenantId, 9999);
metrics.recordApiLatency('GET /listings', 45);
```

### Health Checks

**Endpoints**:
- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity
- `GET /health/redis` - Cache connectivity

---

## Scalability

### Horizontal Scaling

**Stateless API servers**:
- Multiple backend instances behind load balancer
- Session data in Redis (shared state)
- No server-side session storage

### Database Optimization

**Strategies**:
- Proper indexing on frequently queried columns
- Connection pooling (Prisma)
- Read replicas for analytics queries
- Pagination for large result sets

### Caching Strategy

**Layers**:
1. **Application cache** (Redis) - Short TTL (1-60 min)
2. **CDN cache** - Static assets
3. **Browser cache** - Client-side caching

---

## Testing Strategy

### Unit Tests

**Focus**: Business logic in services

```typescript
describe('OrdersService', () => {
  it('should create order with correct total', async () => {
    const order = await service.createOrder(tenantId, dto);
    expect(order.totalPrice).toBe(2998);
  });
});
```

### Integration Tests

**Focus**: API endpoints with database

```typescript
it('POST /orders should create order', async () => {
  const response = await request(app)
    .post('/orders')
    .set('X-Tenant-Slug', 'demo')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [...] })
    .expect(201);
});
```

### E2E Tests

**Focus**: Complete user flows

```typescript
describe('Purchase Flow', () => {
  it('should complete purchase from browse to review', async () => {
    // 1. Browse listings
    // 2. Add to cart
    // 3. Create order
    // 4. Process payment
    // 5. Leave review
  });
});
```

---

## Deployment

### Docker

**Multi-stage build**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main"]
```

### Environment Variables

**Required**:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Token signing secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `REDIS_URL` - Redis connection string

**Optional**:
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment (development/production)

---

## Future Enhancements

### Short-term
- GraphQL API alongside REST
- Real-time notifications (WebSocket)
- Advanced search (Elasticsearch)
- Image optimization pipeline

### Long-term
- Microservices architecture
- Event sourcing for audit trail
- Multi-region deployment
- AI-powered recommendations
