import { PrismaClient, UserRole, ShopStatus, ListingStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-marketplace' },
    update: {},
    create: {
      name: 'Demo Marketplace',
      slug: 'demo-marketplace',
    },
  });
  console.log(`✅ Created tenant: ${tenant.name}`);

  // Create users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash,
      role: UserRole.TENANT_ADMIN,
      profileJson: {
        name: 'Admin User',
      },
    },
  });
  console.log(`✅ Created admin: ${admin.email}`);

  const seller1 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'seller1@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'seller1@demo.com',
      passwordHash,
      role: UserRole.SELLER,
      profileJson: {
        name: 'Seller One',
      },
    },
  });
  console.log(`✅ Created seller: ${seller1.email}`);

  const seller2 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'seller2@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'seller2@demo.com',
      passwordHash,
      role: UserRole.SELLER,
      profileJson: {
        name: 'Seller Two',
      },
    },
  });
  console.log(`✅ Created seller: ${seller2.email}`);

  const buyer = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'buyer@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'buyer@demo.com',
      passwordHash,
      role: UserRole.BUYER,
      profileJson: {
        name: 'Test Buyer',
      },
    },
  });
  console.log(`✅ Created buyer: ${buyer.email}`);

  // Create shops
  const shop1 = await prisma.shop.upsert({
    where: { id: 'shop1-seed' },
    update: {},
    create: {
      id: 'shop1-seed',
      tenantId: tenant.id,
      ownerUserId: seller1.id,
      name: 'Organic Farm Store',
      description: 'Fresh organic produce directly from our farm',
      status: ShopStatus.ACTIVE,
    },
  });
  console.log(`✅ Created shop: ${shop1.name}`);

  const shop2 = await prisma.shop.upsert({
    where: { id: 'shop2-seed' },
    update: {},
    create: {
      id: 'shop2-seed',
      tenantId: tenant.id,
      ownerUserId: seller2.id,
      name: 'Artisan Crafts',
      description: 'Handmade crafts and unique gifts',
      status: ShopStatus.ACTIVE,
    },
  });
  console.log(`✅ Created shop: ${shop2.name}`);

  // Create listings for shop 1 (Organic Farm)
  const listings1 = [
    {
      title: 'Fresh Organic Tomatoes',
      description: 'Vine-ripened organic tomatoes, locally grown',
      price: 499, // $4.99
      stockQty: 100,
      attributesJson: { weight: '1 lb', organic: true, type: 'produce' },
    },
    {
      title: 'Free Range Eggs',
      description: 'Farm fresh eggs from free-range chickens',
      price: 699, // $6.99
      stockQty: 50,
      attributesJson: { quantity: '12 eggs', organic: true, type: 'produce' },
    },
    {
      title: 'Organic Honey',
      description: 'Pure raw honey from local bees',
      price: 1299, // $12.99
      stockQty: 30,
      attributesJson: { size: '16 oz', organic: true, type: 'pantry' },
    },
  ];

  for (const listingData of listings1) {
    const listing = await prisma.listing.create({
      data: {
        ...listingData,
        tenantId: tenant.id,
        shopId: shop1.id,
        status: ListingStatus.ACTIVE,
        currency: 'usd',
      },
    });
    console.log(`✅ Created listing: ${listing.title}`);
  }

  // Create listings for shop 2 (Artisan Crafts)
  const listings2 = [
    {
      title: 'Handwoven Basket',
      description: 'Beautiful handwoven basket made from natural materials',
      price: 3499, // $34.99
      stockQty: 15,
      attributesJson: { size: 'Medium', material: 'Rattan', type: 'home-decor' },
    },
    {
      title: 'Ceramic Coffee Mug',
      description: 'Hand-thrown ceramic mug with unique glaze',
      price: 2499, // $24.99
      stockQty: 25,
      attributesJson: { capacity: '12 oz', handmade: true, type: 'kitchenware' },
    },
    {
      title: 'Wooden Cutting Board',
      description: 'Premium walnut cutting board with juice groove',
      price: 4999, // $49.99
      stockQty: 20,
      attributesJson: {
        size: '18x12 inches',
        material: 'Walnut',
        type: 'kitchenware',
      },
    },
  ];

  for (const listingData of listings2) {
    const listing = await prisma.listing.create({
      data: {
        ...listingData,
        tenantId: tenant.id,
        shopId: shop2.id,
        status: ListingStatus.ACTIVE,
        currency: 'usd',
      },
    });
    console.log(`✅ Created listing: ${listing.title}`);
  }

  console.log('');
  console.log('🎉 Seeding completed!');
  console.log('');
  console.log('📝 Login credentials:');
  console.log('   Admin:   admin@demo.com / password123');
  console.log('   Seller1: seller1@demo.com / password123');
  console.log('   Seller2: seller2@demo.com / password123');
  console.log('   Buyer:   buyer@demo.com / password123');
  console.log('');
  console.log('🏪 Tenant slug: demo-marketplace');
  console.log('   Use header: X-Tenant-Slug: demo-marketplace');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
