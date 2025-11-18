# Quick Start Guide

Get the marketplace running in under 5 minutes!

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL and Redis)

## Step-by-Step Setup

### 1. Start the Database

```bash
# Start PostgreSQL and Redis using Docker
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 2. Install Dependencies

```bash
# Install all dependencies (backend + frontend)
npm install
```

### 3. Configure Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# The default .env.example settings work with docker-compose
# No changes needed for local development!

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed with demo data
npm run seed
```

You should see:
```
✅ Created tenant: Demo Marketplace
✅ Created admin: admin@demo.com
✅ Created seller: seller1@demo.com
✅ Created seller: seller2@demo.com
✅ Created buyer: buyer@demo.com
...
🎉 Seeding completed!
```

### 4. Start Development Servers

From the root directory:

```bash
# Start both backend and frontend
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend (port 3001)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend
npm run dev
```

### 5. Access the Application

Open your browser and navigate to:

- **Landing Page**: http://localhost:3000
- **Demo Marketplace**: http://localhost:3000/demo-marketplace
- **Backend API**: http://localhost:3001

### 6. Login & Explore

Use these demo credentials:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@demo.com | password123 |
| **Seller** | seller1@demo.com | password123 |
| **Buyer** | buyer@demo.com | password123 |

## What to Try

### As a Buyer (buyer@demo.com)
1. Browse the marketplace at http://localhost:3000/demo-marketplace
2. Click on a product to view details
3. Add items to your cart
4. Go to cart and proceed to checkout
5. View your orders in the dashboard

### As a Seller (seller1@demo.com)
1. Login and go to Dashboard
2. Navigate to "My Shops"
3. Create a new shop
4. Go to "My Listings"
5. Create a new product listing
6. View it in the marketplace

### As an Admin (admin@demo.com)
1. Login and go to Dashboard
2. View all shops in the marketplace
3. View all listings
4. View all orders
5. Manage shop and listing statuses

## Testing the API

You can test the API directly using curl:

```bash
# Get all shops (no auth required)
curl -X GET http://localhost:3001/shops \
  -H "X-Tenant-Slug: demo-marketplace"

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "X-Tenant-Slug: demo-marketplace" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@demo.com",
    "password": "password123"
  }'

# Get listings (no auth required)
curl -X GET http://localhost:3001/listings \
  -H "X-Tenant-Slug: demo-marketplace"
```

## Stopping the Application

```bash
# Stop the dev servers
Ctrl+C

# Stop Docker containers
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v
```

## Troubleshooting

### Port Already in Use

If ports 3000, 3001, 5432, or 6379 are already in use:

1. Stop conflicting services
2. Or change ports in:
   - Backend: `backend/.env` (PORT variable)
   - Frontend: Update in `npm run dev` command
   - Docker: Edit `docker-compose.yml`

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Prisma Migration Issues

```bash
cd backend

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Run migrations again
npm run prisma:migrate

# Seed data
npm run seed
```

## Next Steps

- Check out [README.md](README.md) for full documentation
- Explore the codebase
- Customize for your marketplace needs
- Read customization examples in README.md

## Need Help?

- Check the main README.md
- Review the code comments
- Check Prisma schema at `backend/prisma/schema.prisma`
- Review API routes in `backend/src/`

Happy building! 🚀
