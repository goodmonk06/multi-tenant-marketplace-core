#!/usr/bin/env ts-node

/**
 * CLI tool to provision a new tenant
 *
 * Usage:
 *   npm run cli:provision-tenant -- --name "My Marketplace" --slug "my-marketplace"
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import * as bcrypt from 'bcrypt';

interface ProvisionOptions {
  name: string;
  slug: string;
  adminEmail?: string;
  adminPassword?: string;
  withSampleData?: boolean;
}

async function provisionTenant(options: ProvisionOptions) {
  const prisma = new PrismaClient();

  try {
    logger.info('Starting tenant provisioning', { slug: options.slug });

    // Check if tenant already exists
    const existing = await prisma.tenant.findUnique({
      where: { slug: options.slug },
    });

    if (existing) {
      logger.error('Tenant already exists', { slug: options.slug });
      console.error(`❌ Tenant with slug "${options.slug}" already exists`);
      process.exit(1);
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: options.name,
        slug: options.slug,
      },
    });

    console.log(`✓ Created tenant: ${tenant.name} (${tenant.slug})`);
    logger.info('Tenant created', { tenantId: tenant.id, slug: tenant.slug });

    // Create admin user if credentials provided
    if (options.adminEmail && options.adminPassword) {
      const passwordHash = await bcrypt.hash(options.adminPassword, 10);

      const admin = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: options.adminEmail,
          passwordHash,
          role: 'TENANT_ADMIN',
        },
      });

      console.log(`✓ Created admin user: ${admin.email}`);
      logger.info('Admin user created', {
        userId: admin.id,
        email: admin.email,
        tenantId: tenant.id,
      });
    }

    // Create sample data if requested
    if (options.withSampleData) {
      await createSampleData(prisma, tenant.id);
    }

    console.log('\n✅ Tenant provisioning completed successfully!');
    console.log(`\nTenant Details:`);
    console.log(`  ID:   ${tenant.id}`);
    console.log(`  Name: ${tenant.name}`);
    console.log(`  Slug: ${tenant.slug}`);

    if (options.adminEmail) {
      console.log(`\nAdmin Credentials:`);
      console.log(`  Email:    ${options.adminEmail}`);
      console.log(`  Password: ${options.adminPassword}`);
    }

    console.log(`\nAccess your tenant at:`);
    console.log(`  http://localhost:3000`);
    console.log(`  Header: X-Tenant-Slug: ${tenant.slug}`);
  } catch (error) {
    logger.error('Tenant provisioning failed', error as Error);
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createSampleData(prisma: PrismaClient, tenantId: string) {
  console.log('\n📦 Creating sample data...');

  // Create sample categories
  const electronics = await prisma.category.create({
    data: {
      tenantId,
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      sortOrder: 0,
      isActive: true,
    },
  });

  const clothing = await prisma.category.create({
    data: {
      tenantId,
      name: 'Clothing',
      slug: 'clothing',
      description: 'Apparel and fashion items',
      sortOrder: 1,
      isActive: true,
    },
  });

  console.log(`  ✓ Created ${2} categories`);

  // Create sample seller
  const sellerPasswordHash = await bcrypt.hash('seller123', 10);
  const seller = await prisma.user.create({
    data: {
      tenantId,
      email: 'seller@example.com',
      passwordHash: sellerPasswordHash,
      role: 'SELLER',
    },
  });

  console.log(`  ✓ Created sample seller: ${seller.email}`);

  // Create sample shop
  const shop = await prisma.shop.create({
    data: {
      tenantId,
      ownerUserId: seller.id,
      name: 'Sample Shop',
      description: 'A sample shop with great products',
      status: 'ACTIVE',
    },
  });

  console.log(`  ✓ Created sample shop: ${shop.name}`);

  // Create sample listings
  const listing1 = await prisma.listing.create({
    data: {
      tenantId,
      shopId: shop.id,
      title: 'Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      status: 'ACTIVE',
      price: 9999, // $99.99
      currency: 'usd',
      stockQty: 50,
    },
  });

  await prisma.listingCategory.create({
    data: {
      listingId: listing1.id,
      categoryId: electronics.id,
    },
  });

  const listing2 = await prisma.listing.create({
    data: {
      tenantId,
      shopId: shop.id,
      title: 'Cotton T-Shirt',
      description: 'Comfortable 100% cotton t-shirt',
      status: 'ACTIVE',
      price: 1999, // $19.99
      currency: 'usd',
      stockQty: 100,
    },
  });

  await prisma.listingCategory.create({
    data: {
      listingId: listing2.id,
      categoryId: clothing.id,
    },
  });

  console.log(`  ✓ Created ${2} sample listings`);

  // Create sample buyer
  const buyerPasswordHash = await bcrypt.hash('buyer123', 10);
  const buyer = await prisma.user.create({
    data: {
      tenantId,
      email: 'buyer@example.com',
      passwordHash: buyerPasswordHash,
      role: 'BUYER',
    },
  });

  console.log(`  ✓ Created sample buyer: ${buyer.email}`);

  console.log('✓ Sample data created successfully!');
}

// Parse command line arguments
function parseArgs(): ProvisionOptions {
  const args = process.argv.slice(2);
  const options: Partial<ProvisionOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--name':
        options.name = nextArg;
        i++;
        break;
      case '--slug':
        options.slug = nextArg;
        i++;
        break;
      case '--admin-email':
        options.adminEmail = nextArg;
        i++;
        break;
      case '--admin-password':
        options.adminPassword = nextArg;
        i++;
        break;
      case '--with-sample-data':
        options.withSampleData = true;
        break;
    }
  }

  if (!options.name || !options.slug) {
    console.error('Usage: provision-tenant --name <name> --slug <slug> [--admin-email <email>] [--admin-password <password>] [--with-sample-data]');
    process.exit(1);
  }

  return options as ProvisionOptions;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  provisionTenant(options);
}

export { provisionTenant };
