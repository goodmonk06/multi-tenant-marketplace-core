# API Documentation

## Overview

The Multi-Tenant Marketplace API is a RESTful API that supports multiple isolated tenant environments. All API requests must include the `X-Tenant-Slug` header to specify which tenant you're accessing.

## Base URL

```
http://localhost:4000
```

## Authentication

Most endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

**POST** `/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "BUYER"
  }
}
```

## Common Headers

All requests should include:

```
X-Tenant-Slug: demo-marketplace
Content-Type: application/json
Authorization: Bearer <token> (for protected endpoints)
```

---

## Endpoints

### Authentication

#### Register User
**POST** `/auth/register`

Creates a new user account.

Request:
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "role": "BUYER"
}
```

Response: `201 Created`
```json
{
  "id": "user-456",
  "email": "newuser@example.com",
  "role": "BUYER",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Shops

#### List All Shops
**GET** `/shops`

Query Parameters:
- `status` (optional): Filter by shop status (PENDING, ACTIVE, SUSPENDED, CLOSED)
- `limit` (optional, default: 20): Number of results
- `offset` (optional, default: 0): Pagination offset

Response: `200 OK`
```json
[
  {
    "id": "shop-123",
    "name": "Organic Farm Store",
    "description": "Fresh organic produce",
    "status": "ACTIVE",
    "createdAt": "2024-01-10T08:00:00Z",
    "owner": {
      "id": "user-789",
      "email": "seller@example.com"
    }
  }
]
```

#### Create Shop
**POST** `/shops` 🔒 (Requires: SELLER or TENANT_ADMIN)

Request:
```json
{
  "name": "My New Shop",
  "description": "Selling amazing products"
}
```

Response: `201 Created`

#### Get Shop Details
**GET** `/shops/:id`

Response: `200 OK`

#### Update Shop
**PUT** `/shops/:id` 🔒 (Requires: Shop owner or TENANT_ADMIN)

Request:
```json
{
  "name": "Updated Shop Name",
  "description": "New description",
  "status": "ACTIVE"
}
```

Response: `200 OK`

---

### Listings

#### Search Listings
**GET** `/categories/search`

Query Parameters:
- `query` (optional): Text search in title/description
- `categoryId` (optional): Filter by category (includes subcategories)
- `minPrice` (optional): Minimum price in cents
- `maxPrice` (optional): Maximum price in cents
- `sortBy` (optional): `price`, `createdAt`, or `title`
- `sortOrder` (optional): `asc` or `desc`
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

Response: `200 OK`
```json
{
  "listings": [
    {
      "id": "listing-123",
      "title": "Fresh Organic Tomatoes",
      "description": "Vine-ripened tomatoes",
      "price": 499,
      "currency": "usd",
      "stockQty": 100,
      "status": "ACTIVE",
      "shop": {
        "id": "shop-123",
        "name": "Organic Farm Store"
      },
      "categories": [
        {
          "category": {
            "id": "cat-456",
            "name": "Fresh Produce",
            "slug": "fresh-produce"
          }
        }
      ]
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

#### Create Listing
**POST** `/shops/:shopId/listings` 🔒 (Requires: Shop owner or TENANT_ADMIN)

Request:
```json
{
  "title": "New Product",
  "description": "Product description",
  "price": 2999,
  "currency": "usd",
  "stockQty": 50,
  "status": "ACTIVE",
  "attributesJson": {
    "color": "blue",
    "size": "medium"
  }
}
```

Response: `201 Created`

#### Get Listing Details
**GET** `/listings/:id`

Response: `200 OK`

#### Update Listing
**PUT** `/listings/:id` 🔒 (Requires: Listing owner or TENANT_ADMIN)

Response: `200 OK`

---

### Categories

#### Get Category Tree
**GET** `/categories/tree`

Returns hierarchical category structure.

Response: `200 OK`
```json
[
  {
    "id": "cat-1",
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices",
    "parentId": null,
    "sortOrder": 0,
    "isActive": true,
    "children": [
      {
        "id": "cat-2",
        "name": "Smartphones",
        "slug": "smartphones",
        "parentId": "cat-1",
        "sortOrder": 0,
        "isActive": true,
        "_count": {
          "listings": 15
        }
      }
    ],
    "_count": {
      "listings": 42,
      "children": 3
    }
  }
]
```

#### Create Category
**POST** `/categories` 🔒 (Requires: TENANT_ADMIN)

Request:
```json
{
  "name": "Home Decor",
  "slug": "home-decor",
  "description": "Decorative items for home",
  "parentId": null,
  "sortOrder": 0,
  "isActive": true
}
```

Response: `201 Created`

---

### Orders

#### Create Order
**POST** `/orders` 🔒 (Requires: Authenticated user)

Request:
```json
{
  "items": [
    {
      "listingId": "listing-123",
      "quantity": 2
    },
    {
      "listingId": "listing-456",
      "quantity": 1
    }
  ]
}
```

Response: `201 Created`
```json
{
  "id": "order-789",
  "totalPrice": 5997,
  "currency": "usd",
  "status": "PENDING",
  "items": [
    {
      "listingId": "listing-123",
      "quantity": 2,
      "unitPrice": 1999
    }
  ],
  "createdAt": "2024-01-15T14:30:00Z"
}
```

#### Get My Orders
**GET** `/orders/my-orders` 🔒

Query Parameters:
- `status` (optional): Filter by order status
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

Response: `200 OK`

#### Get Order Details
**GET** `/orders/:id` 🔒

Response: `200 OK`

---

### Reviews

#### Create Review
**POST** `/reviews` 🔒

Request:
```json
{
  "listingId": "listing-123",
  "orderId": "order-789",
  "rating": 5,
  "title": "Amazing product!",
  "comment": "Exceeded my expectations. Highly recommend!"
}
```

Response: `201 Created`

**Note:** Reviews are created with `PENDING` status and require admin moderation.

#### Get Listing Reviews
**GET** `/reviews/listing/:listingId`

Query Parameters:
- `status` (optional): Filter by review status (APPROVED, PENDING, REJECTED)
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

Response: `200 OK`
```json
[
  {
    "id": "review-123",
    "listingId": "listing-123",
    "userId": "user-456",
    "rating": 5,
    "title": "Great product",
    "comment": "Loved it!",
    "status": "APPROVED",
    "isVerified": true,
    "helpfulCount": 12,
    "createdAt": "2024-01-14T10:00:00Z",
    "user": {
      "id": "user-456",
      "email": "buyer@example.com"
    }
  }
]
```

#### Get Review Statistics
**GET** `/reviews/listing/:listingId/stats`

Response: `200 OK`
```json
{
  "totalReviews": 45,
  "averageRating": 4.6,
  "ratingDistribution": {
    "1": 1,
    "2": 2,
    "3": 5,
    "4": 12,
    "5": 25
  },
  "verifiedPurchaseCount": 38
}
```

#### Moderate Review
**PUT** `/reviews/:id/moderate` 🔒 (Requires: TENANT_ADMIN)

Request:
```json
{
  "status": "APPROVED"
}
```

Response: `200 OK`

#### Mark Review as Helpful
**POST** `/reviews/:id/helpful`

Increments the helpful count for a review.

Response: `200 OK`

---

### Cart

#### Get Cart
**GET** `/cart` 🔒

Response: `200 OK`
```json
{
  "items": [
    {
      "id": "cart-item-1",
      "listingId": "listing-123",
      "quantity": 2,
      "listing": {
        "id": "listing-123",
        "title": "Product Name",
        "price": 1999,
        "shop": {
          "name": "Shop Name"
        }
      }
    }
  ]
}
```

#### Add to Cart
**POST** `/cart` 🔒

Request:
```json
{
  "listingId": "listing-123",
  "quantity": 2
}
```

Response: `201 Created`

#### Update Cart Item
**PUT** `/cart/:itemId` 🔒

Request:
```json
{
  "quantity": 3
}
```

Response: `200 OK`

#### Remove from Cart
**DELETE** `/cart/:itemId` 🔒

Response: `204 No Content`

---

### Payments

#### Create Payment Intent
**POST** `/payments/create-intent` 🔒

Request:
```json
{
  "orderId": "order-789"
}
```

Response: `200 OK`
```json
{
  "clientSecret": "pi_secret_...",
  "paymentIntentId": "pi_123456",
  "amount": 5997,
  "currency": "usd"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## Rate Limiting

API requests are rate limited to prevent abuse:
- **Anonymous requests**: 100 requests per 15 minutes
- **Authenticated requests**: 1000 requests per 15 minutes

---

## Pagination

List endpoints support pagination using `limit` and `offset` query parameters:

```
GET /listings?limit=20&offset=40
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 40,
  "hasMore": true
}
```

---

## Multi-Tenancy

Every request must include the `X-Tenant-Slug` header:

```
X-Tenant-Slug: demo-marketplace
```

This header determines which tenant's data you're accessing. All data is completely isolated between tenants.

---

## Examples

### Complete Purchase Flow

1. **Browse listings**
   ```bash
   curl -X GET http://localhost:4000/categories/search?query=organic \
     -H "X-Tenant-Slug: demo-marketplace"
   ```

2. **Add to cart**
   ```bash
   curl -X POST http://localhost:4000/cart \
     -H "X-Tenant-Slug: demo-marketplace" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"listingId": "listing-123", "quantity": 2}'
   ```

3. **Create order**
   ```bash
   curl -X POST http://localhost:4000/orders \
     -H "X-Tenant-Slug: demo-marketplace" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"items": [{"listingId": "listing-123", "quantity": 2}]}'
   ```

4. **Create payment**
   ```bash
   curl -X POST http://localhost:4000/payments/create-intent \
     -H "X-Tenant-Slug: demo-marketplace" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"orderId": "order-789"}'
   ```

5. **Leave a review**
   ```bash
   curl -X POST http://localhost:4000/reviews \
     -H "X-Tenant-Slug: demo-marketplace" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"listingId": "listing-123", "orderId": "order-789", "rating": 5, "comment": "Great!"}'
   ```
