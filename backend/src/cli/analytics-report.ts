#!/usr/bin/env ts-node

/**
 * CLI tool to generate analytics reports for a tenant
 *
 * Usage:
 *   npm run cli:analytics-report -- --tenant my-marketplace --period 30d
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

interface ReportOptions {
  tenantSlug: string;
  period: string; // e.g., "7d", "30d", "90d"
  output?: string; // Optional: save to file
}

interface AnalyticsReport {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  period: {
    start: Date;
    end: Date;
    days: number;
  };
  overview: {
    totalOrders: number;
    totalRevenue: number;
    totalUsers: number;
    totalShops: number;
    totalListings: number;
    totalReviews: number;
  };
  orderStats: {
    byStatus: Record<string, number>;
    averageOrderValue: number;
    topBuyers: Array<{ email: string; orderCount: number; totalSpent: number }>;
  };
  shopStats: {
    topShops: Array<{ name: string; orderCount: number; revenue: number }>;
  };
  listingStats: {
    topListings: Array<{ title: string; orders: number; revenue: number }>;
    byCategory: Array<{ category: string; count: number }>;
  };
  reviewStats: {
    totalReviews: number;
    averageRating: number;
    byStatus: Record<string, number>;
  };
}

async function generateAnalyticsReport(options: ReportOptions) {
  const prisma = new PrismaClient();

  try {
    logger.info('Generating analytics report', {
      tenantSlug: options.tenantSlug,
      period: options.period,
    });

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { slug: options.tenantSlug },
    });

    if (!tenant) {
      console.error(`❌ Tenant not found: ${options.tenantSlug}`);
      process.exit(1);
    }

    // Parse period
    const days = parseInt(options.period.replace('d', ''), 10);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`📊 Generating analytics report for ${tenant.name}`);
    console.log(`   Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n`);

    // Gather statistics
    const [
      totalOrders,
      totalUsers,
      totalShops,
      totalListings,
      totalReviews,
      orders,
      reviews,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.user.count({ where: { tenantId: tenant.id } }),
      prisma.shop.count({ where: { tenantId: tenant.id } }),
      prisma.listing.count({ where: { tenantId: tenant.id } }),
      prisma.review.count({ where: { tenantId: tenant.id } }),
      prisma.order.findMany({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          buyer: {
            select: { email: true },
          },
          items: {
            include: {
              listing: {
                include: {
                  shop: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.review.findMany({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Calculate revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    // Order stats by status
    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top buyers
    const buyerStats = orders.reduce((acc, order) => {
      const email = order.buyer.email;
      if (!acc[email]) {
        acc[email] = { email, orderCount: 0, totalSpent: 0 };
      }
      acc[email].orderCount++;
      acc[email].totalSpent += order.totalPrice;
      return acc;
    }, {} as Record<string, any>);

    const topBuyers = Object.values(buyerStats)
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Top shops
    const shopStats = orders.reduce((acc, order) => {
      order.items.forEach((item) => {
        const shopName = item.listing.shop.name;
        if (!acc[shopName]) {
          acc[shopName] = { name: shopName, orderCount: 0, revenue: 0 };
        }
        acc[shopName].orderCount++;
        acc[shopName].revenue += item.unitPrice * item.quantity;
      });
      return acc;
    }, {} as Record<string, any>);

    const topShops = Object.values(shopStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);

    // Review stats
    const reviewsByStatus = reviews.reduce((acc, review) => {
      acc[review.status] = (acc[review.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    // Build report
    const report: AnalyticsReport = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      period: {
        start: startDate,
        end: endDate,
        days,
      },
      overview: {
        totalOrders,
        totalRevenue,
        totalUsers,
        totalShops,
        totalListings,
        totalReviews,
      },
      orderStats: {
        byStatus: ordersByStatus,
        averageOrderValue: avgOrderValue,
        topBuyers,
      },
      shopStats: {
        topShops,
      },
      listingStats: {
        topListings: [],
        byCategory: [],
      },
      reviewStats: {
        totalReviews: reviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
        byStatus: reviewsByStatus,
      },
    };

    // Display report
    displayReport(report);

    // Save to file if requested
    if (options.output) {
      const fs = require('fs');
      fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved to: ${options.output}`);
    }

    logger.info('Analytics report generated', {
      tenantId: tenant.id,
      totalOrders,
      totalRevenue,
    });
  } catch (error) {
    logger.error('Analytics report generation failed', error as Error);
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function displayReport(report: AnalyticsReport) {
  console.log('═'.repeat(60));
  console.log('OVERVIEW');
  console.log('═'.repeat(60));
  console.log(`Total Orders:    ${report.overview.totalOrders}`);
  console.log(`Total Revenue:   $${(report.overview.totalRevenue / 100).toFixed(2)}`);
  console.log(`Total Users:     ${report.overview.totalUsers}`);
  console.log(`Total Shops:     ${report.overview.totalShops}`);
  console.log(`Total Listings:  ${report.overview.totalListings}`);
  console.log(`Total Reviews:   ${report.overview.totalReviews}`);

  console.log('\n' + '═'.repeat(60));
  console.log('ORDER STATISTICS');
  console.log('═'.repeat(60));
  console.log(`Average Order Value: $${(report.orderStats.averageOrderValue / 100).toFixed(2)}`);
  console.log('\nOrders by Status:');
  Object.entries(report.orderStats.byStatus).forEach(([status, count]) => {
    console.log(`  ${status.padEnd(20)} ${count}`);
  });

  if (report.orderStats.topBuyers.length > 0) {
    console.log('\nTop Buyers:');
    report.orderStats.topBuyers.forEach((buyer, index) => {
      console.log(`  ${index + 1}. ${buyer.email.padEnd(30)} ${buyer.orderCount} orders, $${(buyer.totalSpent / 100).toFixed(2)}`);
    });
  }

  if (report.shopStats.topShops.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('TOP SHOPS');
    console.log('═'.repeat(60));
    report.shopStats.topShops.forEach((shop, index) => {
      console.log(`  ${index + 1}. ${shop.name.padEnd(30)} ${shop.orderCount} orders, $${(shop.revenue / 100).toFixed(2)}`);
    });
  }

  console.log('\n' + '═'.repeat(60));
  console.log('REVIEW STATISTICS');
  console.log('═'.repeat(60));
  console.log(`Total Reviews:   ${report.reviewStats.totalReviews}`);
  console.log(`Average Rating:  ${report.reviewStats.averageRating.toFixed(1)} / 5.0`);
  console.log('\nReviews by Status:');
  Object.entries(report.reviewStats.byStatus).forEach(([status, count]) => {
    console.log(`  ${status.padEnd(20)} ${count}`);
  });

  console.log('\n' + '═'.repeat(60));
}

function parseArgs(): ReportOptions {
  const args = process.argv.slice(2);
  const options: Partial<ReportOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--tenant':
        options.tenantSlug = nextArg;
        i++;
        break;
      case '--period':
        options.period = nextArg;
        i++;
        break;
      case '--output':
        options.output = nextArg;
        i++;
        break;
    }
  }

  if (!options.tenantSlug || !options.period) {
    console.error('Usage: analytics-report --tenant <slug> --period <period> [--output <file>]');
    console.error('Example: analytics-report --tenant my-marketplace --period 30d --output report.json');
    process.exit(1);
  }

  return options as ReportOptions;
}

if (require.main === module) {
  const options = parseArgs();
  generateAnalyticsReport(options);
}

export { generateAnalyticsReport };
