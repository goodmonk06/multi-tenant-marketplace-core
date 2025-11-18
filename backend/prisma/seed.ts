import {
  PrismaClient,
  UserRole,
  ShopStatus,
  ListingStatus,
  OrderStatus,
  ReviewStatus,
  DiscountType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with rich scenarios...\n');

  // ============================================================================
  // TENANT 1: Demo Marketplace (Full-featured)
  // ============================================================================
  const tenant1 = await prisma.tenant.upsert({
    where: { slug: 'demo-marketplace' },
    update: {},
    create: {
      name: 'Demo Marketplace',
      slug: 'demo-marketplace',
    },
  });
  console.log(`✓ Created tenant: ${tenant1.name}`);

  // Create password hash
  const passwordHash = await bcrypt.hash('password123', 10);

  // --- Users for Tenant 1 ---
  const admin1 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant1.id,
        email: 'admin@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      email: 'admin@demo.com',
      passwordHash,
      role: UserRole.TENANT_ADMIN,
      profileJson: {
        name: 'Admin User',
        bio: 'Marketplace administrator',
      },
    },
  });

  const seller1 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant1.id,
        email: 'seller1@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      email: 'seller1@demo.com',
      passwordHash,
      role: UserRole.SELLER,
      profileJson: {
        name: 'Sarah Johnson',
        bio: 'Organic farmer passionate about sustainable agriculture',
      },
    },
  });

  const seller2 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant1.id,
        email: 'seller2@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      email: 'seller2@demo.com',
      passwordHash,
      role: UserRole.SELLER,
      profileJson: {
        name: 'Michael Chen',
        bio: 'Artisan craftsman creating unique handmade goods',
      },
    },
  });

  const seller3 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant1.id,
        email: 'seller3@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      email: 'seller3@demo.com',
      passwordHash,
      role: UserRole.SELLER,
      profileJson: {
        name: 'Emily Rodriguez',
        bio: 'Tech enthusiast and gadget seller',
      },
    },
  });

  const buyers = [];
  for (let i = 1; i <= 5; i++) {
    const buyer = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant1.id,
          email: `buyer${i}@demo.com`,
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        email: `buyer${i}@demo.com`,
        passwordHash,
        role: UserRole.BUYER,
        profileJson: {
          name: `Buyer ${i}`,
        },
      },
    });
    buyers.push(buyer);
  }

  console.log(`✓ Created ${buyers.length + 4} users for ${tenant1.name}`);

  // --- Categories for Tenant 1 ---
  const categories = {
    electronics: await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant1.id,
          slug: 'electronics',
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
        sortOrder: 0,
        isActive: true,
      },
    }),
    food: await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant1.id,
          slug: 'food-beverages',
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        name: 'Food & Beverages',
        slug: 'food-beverages',
        description: 'Fresh produce and artisanal food products',
        sortOrder: 1,
        isActive: true,
      },
    }),
    crafts: await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant1.id,
          slug: 'handmade-crafts',
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        name: 'Handmade Crafts',
        slug: 'handmade-crafts',
        description: 'Artisan handcrafted items',
        sortOrder: 2,
        isActive: true,
      },
    }),
  };

  // Subcategories
  const subcategories = {
    smartphones: await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant1.id,
          slug: 'smartphones',
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        name: 'Smartphones',
        slug: 'smartphones',
        parentId: categories.electronics.id,
        sortOrder: 0,
        isActive: true,
      },
    }),
    produce: await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant1.id,
          slug: 'fresh-produce',
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        name: 'Fresh Produce',
        slug: 'fresh-produce',
        parentId: categories.food.id,
        sortOrder: 0,
        isActive: true,
      },
    }),
    homeDecor: await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant1.id,
          slug: 'home-decor',
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        name: 'Home Decor',
        slug: 'home-decor',
        parentId: categories.crafts.id,
        sortOrder: 0,
        isActive: true,
      },
    }),
  };

  console.log(`✓ Created ${Object.keys(categories).length + Object.keys(subcategories).length} categories`);

  // --- Shops for Tenant 1 ---
  const shop1 = await prisma.shop.upsert({
    where: { id: 'shop1-seed' },
    update: {},
    create: {
      id: 'shop1-seed',
      tenantId: tenant1.id,
      ownerUserId: seller1.id,
      name: 'Organic Farm Store',
      description: 'Fresh organic produce directly from our sustainable farm',
      status: ShopStatus.ACTIVE,
    },
  });

  const shop2 = await prisma.shop.upsert({
    where: { id: 'shop2-seed' },
    update: {},
    create: {
      id: 'shop2-seed',
      tenantId: tenant1.id,
      ownerUserId: seller2.id,
      name: 'Artisan Crafts',
      description: 'Handmade crafts and unique gifts with love and care',
      status: ShopStatus.ACTIVE,
    },
  });

  const shop3 = await prisma.shop.upsert({
    where: { id: 'shop3-seed' },
    update: {},
    create: {
      id: 'shop3-seed',
      tenantId: tenant1.id,
      ownerUserId: seller3.id,
      name: 'Tech Haven',
      description: 'Latest tech gadgets and accessories',
      status: ShopStatus.ACTIVE,
    },
  });

  console.log(`✓ Created 3 shops`);

  // --- Listings for Tenant 1 ---
  const listings = [];

  // Shop 1 - Organic Farm (Food)
  const farmListings = [
    {
      title: 'Fresh Organic Tomatoes',
      description: 'Vine-ripened organic tomatoes, locally grown. Perfect for salads and cooking.',
      price: 499,
      stockQty: 100,
      attributesJson: { weight: '1 lb', organic: true, variety: 'Heirloom' },
      category: subcategories.produce,
    },
    {
      title: 'Free Range Eggs',
      description: 'Farm fresh eggs from free-range chickens fed organic feed.',
      price: 699,
      stockQty: 50,
      attributesJson: { quantity: '12 eggs', organic: true, grade: 'A' },
      category: categories.food,
    },
    {
      title: 'Organic Honey',
      description: 'Pure raw honey from local bees. Unfiltered and unpasteurized.',
      price: 1299,
      stockQty: 30,
      attributesJson: { size: '16 oz', organic: true, type: 'Wildflower' },
      category: categories.food,
    },
    {
      title: 'Fresh Basil Bunch',
      description: 'Aromatic fresh basil, perfect for pesto and Italian dishes.',
      price: 349,
      stockQty: 75,
      attributesJson: { weight: '2 oz', organic: true },
      category: subcategories.produce,
    },
  ];

  for (const data of farmListings) {
    const listing = await prisma.listing.create({
      data: {
        tenantId: tenant1.id,
        shopId: shop1.id,
        title: data.title,
        description: data.description,
        price: data.price,
        stockQty: data.stockQty,
        status: ListingStatus.ACTIVE,
        currency: 'usd',
        attributesJson: data.attributesJson,
      },
    });

    await prisma.listingCategory.create({
      data: {
        listingId: listing.id,
        categoryId: data.category.id,
      },
    });

    listings.push(listing);
  }

  // Shop 2 - Artisan Crafts
  const craftListings = [
    {
      title: 'Handwoven Basket',
      description: 'Beautiful handwoven basket made from natural rattan materials.',
      price: 3499,
      stockQty: 15,
      attributesJson: { size: 'Medium', material: 'Rattan', handmade: true },
      category: subcategories.homeDecor,
    },
    {
      title: 'Ceramic Coffee Mug Set',
      description: 'Hand-thrown ceramic mugs with unique blue glaze. Set of 4.',
      price: 4999,
      stockQty: 25,
      attributesJson: { capacity: '12 oz each', handmade: true, dishwasher_safe: true },
      category: categories.crafts,
    },
    {
      title: 'Wooden Cutting Board',
      description: 'Premium walnut cutting board with juice groove and handles.',
      price: 4999,
      stockQty: 20,
      attributesJson: { size: '18x12 inches', material: 'Walnut', food_safe: true },
      category: categories.crafts,
    },
    {
      title: 'Macrame Wall Hanging',
      description: 'Bohemian macrame wall hanging, perfect for bedroom or living room.',
      price: 5999,
      stockQty: 10,
      attributesJson: { size: '24x36 inches', material: 'Cotton cord', handmade: true },
      category: subcategories.homeDecor,
    },
  ];

  for (const data of craftListings) {
    const listing = await prisma.listing.create({
      data: {
        tenantId: tenant1.id,
        shopId: shop2.id,
        title: data.title,
        description: data.description,
        price: data.price,
        stockQty: data.stockQty,
        status: ListingStatus.ACTIVE,
        currency: 'usd',
        attributesJson: data.attributesJson,
      },
    });

    await prisma.listingCategory.create({
      data: {
        listingId: listing.id,
        categoryId: data.category.id,
      },
    });

    listings.push(listing);
  }

  // Shop 3 - Tech Haven
  const techListings = [
    {
      title: 'Wireless Bluetooth Headphones',
      description: 'Premium noise-cancelling wireless headphones with 30-hour battery life.',
      price: 9999,
      stockQty: 40,
      attributesJson: { brand: 'TechSound', wireless: true, noise_cancelling: true },
      category: categories.electronics,
    },
    {
      title: 'USB-C Fast Charger',
      description: '65W USB-C fast charger compatible with laptops, tablets, and phones.',
      price: 2999,
      stockQty: 60,
      attributesJson: { power: '65W', ports: '2', fast_charging: true },
      category: categories.electronics,
    },
    {
      title: 'Wireless Phone Charger',
      description: '15W Qi wireless charging pad with anti-slip surface.',
      price: 1999,
      stockQty: 50,
      attributesJson: { power: '15W', qi_certified: true },
      category: subcategories.smartphones,
    },
  ];

  for (const data of techListings) {
    const listing = await prisma.listing.create({
      data: {
        tenantId: tenant1.id,
        shopId: shop3.id,
        title: data.title,
        description: data.description,
        price: data.price,
        stockQty: data.stockQty,
        status: ListingStatus.ACTIVE,
        currency: 'usd',
        attributesJson: data.attributesJson,
      },
    });

    await prisma.listingCategory.create({
      data: {
        listingId: listing.id,
        categoryId: data.category.id,
      },
    });

    listings.push(listing);
  }

  console.log(`✓ Created ${listings.length} listings`);

  // --- Orders for Tenant 1 ---
  const orders = [];

  // Completed order
  const order1 = await prisma.order.create({
    data: {
      tenantId: tenant1.id,
      buyerId: buyers[0].id,
      totalPrice: 8497, // $84.97
      currency: 'usd',
      status: OrderStatus.DELIVERED,
      paymentProvider: 'stripe',
      paymentIntentId: 'pi_demo_completed_001',
      items: {
        create: [
          {
            listingId: listings[0].id, // Tomatoes
            quantity: 2,
            unitPrice: 499,
          },
          {
            listingId: listings[1].id, // Eggs
            quantity: 1,
            unitPrice: 699,
          },
          {
            listingId: listings[8].id, // Headphones
            quantity: 1,
            unitPrice: 6999,
          },
        ],
      },
    },
  });
  orders.push(order1);

  // Order in processing
  const order2 = await prisma.order.create({
    data: {
      tenantId: tenant1.id,
      buyerId: buyers[1].id,
      totalPrice: 10998,
      currency: 'usd',
      status: OrderStatus.PROCESSING,
      paymentProvider: 'stripe',
      paymentIntentId: 'pi_demo_processing_001',
      items: {
        create: [
          {
            listingId: listings[5].id, // Ceramic mugs
            quantity: 2,
            unitPrice: 4999,
          },
          {
            listingId: listings[3].id, // Basil
            quantity: 2,
            unitPrice: 349,
          },
        ],
      },
    },
  });
  orders.push(order2);

  // Pending payment order
  const order3 = await prisma.order.create({
    data: {
      tenantId: tenant1.id,
      buyerId: buyers[2].id,
      totalPrice: 3499,
      currency: 'usd',
      status: OrderStatus.PAYMENT_PENDING,
      paymentProvider: 'stripe',
      paymentIntentId: 'pi_demo_pending_001',
      items: {
        create: [
          {
            listingId: listings[4].id, // Basket
            quantity: 1,
            unitPrice: 3499,
          },
        ],
      },
    },
  });
  orders.push(order3);

  console.log(`✓ Created ${orders.length} orders with various statuses`);

  // --- Reviews for Tenant 1 ---
  const reviews = [
    // Approved reviews
    {
      listingId: listings[0].id,
      orderId: order1.id,
      userId: buyers[0].id,
      rating: 5,
      title: 'Amazing tomatoes!',
      comment: 'Best tomatoes I\'ve ever tasted. So fresh and flavorful!',
      status: ReviewStatus.APPROVED,
      isVerified: true,
    },
    {
      listingId: listings[1].id,
      orderId: order1.id,
      userId: buyers[0].id,
      rating: 5,
      title: 'Perfect eggs',
      comment: 'The eggs are so fresh, bright orange yolks. Worth every penny.',
      status: ReviewStatus.APPROVED,
      isVerified: true,
    },
    {
      listingId: listings[5].id,
      userId: buyers[3].id,
      rating: 4,
      title: 'Beautiful mugs',
      comment: 'Gorgeous handmade mugs. One had a tiny imperfection but overall great quality.',
      status: ReviewStatus.APPROVED,
      isVerified: false,
    },
    {
      listingId: listings[8].id,
      orderId: order1.id,
      userId: buyers[0].id,
      rating: 5,
      title: 'Excellent headphones',
      comment: 'Sound quality is incredible and battery lasts forever. Highly recommend!',
      status: ReviewStatus.APPROVED,
      isVerified: true,
    },
    // Pending reviews
    {
      listingId: listings[6].id,
      userId: buyers[4].id,
      rating: 3,
      title: 'Good but pricey',
      comment: 'Nice cutting board but seems a bit expensive for the size.',
      status: ReviewStatus.PENDING,
      isVerified: false,
    },
    {
      listingId: listings[2].id,
      userId: buyers[2].id,
      rating: 5,
      title: 'Delicious honey',
      comment: 'This honey is amazing! Pure and natural taste.',
      status: ReviewStatus.PENDING,
      isVerified: false,
    },
  ];

  for (const reviewData of reviews) {
    await prisma.review.create({
      data: {
        tenantId: tenant1.id,
        ...reviewData,
      },
    });
  }

  console.log(`✓ Created ${reviews.length} reviews`);

  // --- Favorites for Tenant 1 ---
  const favorites = [
    { userId: buyers[0].id, listingId: listings[2].id },
    { userId: buyers[0].id, listingId: listings[5].id },
    { userId: buyers[1].id, listingId: listings[7].id },
    { userId: buyers[1].id, listingId: listings[8].id },
    { userId: buyers[2].id, listingId: listings[0].id },
  ];

  for (const fav of favorites) {
    await prisma.favorite.create({
      data: {
        tenantId: tenant1.id,
        ...fav,
      },
    });
  }

  console.log(`✓ Created ${favorites.length} favorites`);

  // --- Coupons for Tenant 1 ---
  const coupons = [
    {
      code: 'WELCOME10',
      description: 'Welcome discount - 10% off',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minPurchase: 1000,
      usageLimit: 100,
      usageCount: 5,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31'),
      isActive: true,
    },
    {
      code: 'SUMMER25',
      description: 'Summer sale - $25 off orders over $100',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 2500,
      minPurchase: 10000,
      usageLimit: 50,
      usageCount: 12,
      validFrom: new Date('2024-06-01'),
      validUntil: new Date('2024-08-31'),
      isActive: true,
    },
    {
      code: 'EXPIRED2023',
      description: 'Expired coupon from 2023',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minPurchase: null,
      usageLimit: null,
      usageCount: 50,
      validFrom: new Date('2023-01-01'),
      validUntil: new Date('2023-12-31'),
      isActive: false,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.create({
      data: {
        tenantId: tenant1.id,
        ...coupon,
      },
    });
  }

  console.log(`✓ Created ${coupons.length} coupons`);

  // ============================================================================
  // TENANT 2: Tech Marketplace (Smaller, focused on electronics)
  // ============================================================================
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'tech-marketplace' },
    update: {},
    create: {
      name: 'Tech Marketplace',
      slug: 'tech-marketplace',
    },
  });
  console.log(`\n✓ Created tenant: ${tenant2.name}`);

  const admin2 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant2.id,
        email: 'admin@tech.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'admin@tech.com',
      passwordHash,
      role: UserRole.TENANT_ADMIN,
    },
  });

  const techSeller = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant2.id,
        email: 'seller@tech.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'seller@tech.com',
      passwordHash,
      role: UserRole.SELLER,
    },
  });

  const techBuyer = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant2.id,
        email: 'buyer@tech.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'buyer@tech.com',
      passwordHash,
      role: UserRole.BUYER,
    },
  });

  const techCategory = await prisma.category.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant2.id,
        slug: 'electronics',
      },
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      name: 'Electronics',
      slug: 'electronics',
      sortOrder: 0,
      isActive: true,
    },
  });

  const techShop = await prisma.shop.upsert({
    where: { id: 'tech-shop-seed' },
    update: {},
    create: {
      id: 'tech-shop-seed',
      tenantId: tenant2.id,
      ownerUserId: techSeller.id,
      name: 'Gadget Store',
      description: 'Latest tech gadgets',
      status: ShopStatus.ACTIVE,
    },
  });

  const techListing = await prisma.listing.create({
    data: {
      tenantId: tenant2.id,
      shopId: techShop.id,
      title: 'Smartphone Case',
      description: 'Protective case for smartphones',
      price: 1999,
      stockQty: 100,
      status: ListingStatus.ACTIVE,
      currency: 'usd',
    },
  });

  await prisma.listingCategory.create({
    data: {
      listingId: techListing.id,
      categoryId: techCategory.id,
    },
  });

  console.log(`✓ Created minimal data for ${tenant2.name}`);

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Seeding completed successfully!');
  console.log('='.repeat(60));

  console.log('\n📊 Summary:');
  console.log(`  Tenants:    2`);
  console.log(`  Users:      ${buyers.length + 7}`);
  console.log(`  Categories: ${Object.keys(categories).length + Object.keys(subcategories).length + 1}`);
  console.log(`  Shops:      4`);
  console.log(`  Listings:   ${listings.length + 1}`);
  console.log(`  Orders:     ${orders.length}`);
  console.log(`  Reviews:    ${reviews.length}`);
  console.log(`  Favorites:  ${favorites.length}`);
  console.log(`  Coupons:    ${coupons.length}`);

  console.log('\n📝 Login Credentials:');
  console.log('\n  DEMO MARKETPLACE (X-Tenant-Slug: demo-marketplace)');
  console.log('    Admin:   admin@demo.com / password123');
  console.log('    Seller1: seller1@demo.com / password123');
  console.log('    Seller2: seller2@demo.com / password123');
  console.log('    Seller3: seller3@demo.com / password123');
  console.log('    Buyers:  buyer1@demo.com ... buyer5@demo.com / password123');

  console.log('\n  TECH MARKETPLACE (X-Tenant-Slug: tech-marketplace)');
  console.log('    Admin:   admin@tech.com / password123');
  console.log('    Seller:  seller@tech.com / password123');
  console.log('    Buyer:   buyer@tech.com / password123');

  console.log('\n🔑 Key Features Demonstrated:');
  console.log('  ✓ Multi-tenant isolation');
  console.log('  ✓ Hierarchical categories (parent/child)');
  console.log('  ✓ Complete purchase flow (orders with various statuses)');
  console.log('  ✓ Review system with moderation (approved/pending)');
  console.log('  ✓ Verified vs unverified reviews');
  console.log('  ✓ Wishlist/favorites');
  console.log('  ✓ Promotional coupons (active/expired)');
  console.log('  ✓ Multiple shops and sellers');
  console.log('  ✓ Rich product attributes');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
