#!/usr/bin/env ts-node

/**
 * CLI tool to bulk import listings from CSV
 *
 * Usage:
 *   npm run cli:bulk-import -- --tenant my-marketplace --shop shop-123 --file listings.csv
 *
 * CSV Format:
 *   title,description,price,currency,stockQty,categories
 *   Product Name,Product description,1999,usd,50,"electronics,gadgets"
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import * as fs from 'fs';
import * as path from 'path';

interface ImportOptions {
  tenantSlug: string;
  shopId: string;
  filePath: string;
  dryRun?: boolean;
}

interface ListingRow {
  title: string;
  description: string;
  price: number;
  currency: string;
  stockQty: number;
  categories: string[];
}

async function bulkImportListings(options: ImportOptions) {
  const prisma = new PrismaClient();

  try {
    logger.info('Starting bulk import', {
      tenantSlug: options.tenantSlug,
      shopId: options.shopId,
      filePath: options.filePath,
    });

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { slug: options.tenantSlug },
    });

    if (!tenant) {
      console.error(`❌ Tenant not found: ${options.tenantSlug}`);
      process.exit(1);
    }

    // Verify shop exists
    const shop = await prisma.shop.findFirst({
      where: {
        id: options.shopId,
        tenantId: tenant.id,
      },
    });

    if (!shop) {
      console.error(`❌ Shop not found: ${options.shopId}`);
      process.exit(1);
    }

    // Read and parse CSV file
    const filePath = path.resolve(options.filePath);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(fileContent);

    console.log(`📄 Found ${rows.length} listings to import`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - No data will be imported\n');
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.title} - $${(row.price / 100).toFixed(2)}`);
      });
      return;
    }

    // Get all categories for tenant
    const categories = await prisma.category.findMany({
      where: { tenantId: tenant.id },
    });

    const categoryMap = new Map(
      categories.map((cat) => [cat.slug, cat.id]),
    );

    // Import listings
    let successCount = 0;
    let errorCount = 0;

    for (const [index, row] of rows.entries()) {
      try {
        const listing = await prisma.listing.create({
          data: {
            tenantId: tenant.id,
            shopId: shop.id,
            title: row.title,
            description: row.description,
            price: row.price,
            currency: row.currency,
            stockQty: row.stockQty,
            status: 'DRAFT', // Import as draft by default
          },
        });

        // Associate categories
        for (const catSlug of row.categories) {
          const categoryId = categoryMap.get(catSlug);
          if (categoryId) {
            await prisma.listingCategory.create({
              data: {
                listingId: listing.id,
                categoryId,
              },
            });
          } else {
            console.warn(`  ⚠ Category not found: ${catSlug}`);
          }
        }

        successCount++;
        console.log(`  ✓ Imported: ${row.title}`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Failed: ${row.title} - ${(error as Error).message}`);
      }
    }

    console.log(`\n✅ Import completed!`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Total: ${rows.length}`);

    logger.info('Bulk import completed', {
      tenantId: tenant.id,
      shopId: shop.id,
      successCount,
      errorCount,
      totalCount: rows.length,
    });
  } catch (error) {
    logger.error('Bulk import failed', error as Error);
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function parseCSV(content: string): ListingRow[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const rows: ListingRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    rows.push({
      title: row.title,
      description: row.description || '',
      price: parseInt(row.price, 10),
      currency: row.currency || 'usd',
      stockQty: parseInt(row.stockQty, 10) || 0,
      categories: row.categories ? row.categories.split(';').map((s: string) => s.trim()) : [],
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseArgs(): ImportOptions {
  const args = process.argv.slice(2);
  const options: Partial<ImportOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--tenant':
        options.tenantSlug = nextArg;
        i++;
        break;
      case '--shop':
        options.shopId = nextArg;
        i++;
        break;
      case '--file':
        options.filePath = nextArg;
        i++;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
    }
  }

  if (!options.tenantSlug || !options.shopId || !options.filePath) {
    console.error('Usage: bulk-import --tenant <slug> --shop <shop-id> --file <csv-file> [--dry-run]');
    process.exit(1);
  }

  return options as ImportOptions;
}

if (require.main === module) {
  const options = parseArgs();
  bulkImportListings(options);
}

export { bulkImportListings };
