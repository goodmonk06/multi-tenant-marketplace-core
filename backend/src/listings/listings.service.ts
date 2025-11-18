import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Listing, ListingStatus } from '@prisma/client';
import { ShopsService } from '../shops/shops.service';

export interface CreateListingDto {
  shopId: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  stockQty?: number;
  attributesJson?: any;
}

export interface UpdateListingDto {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  stockQty?: number;
  status?: ListingStatus;
  attributesJson?: any;
}

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private shopsService: ShopsService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    data: CreateListingDto,
  ): Promise<Listing> {
    // Verify shop exists and belongs to tenant
    const shop = await this.shopsService.findById(data.shopId, tenantId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Verify user owns the shop
    if (shop.ownerUserId !== userId) {
      throw new ForbiddenException('You can only add listings to your own shop');
    }

    return this.prisma.listing.create({
      data: {
        tenantId,
        shopId: data.shopId,
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency || 'usd',
        stockQty: data.stockQty,
        attributesJson: data.attributesJson,
        status: ListingStatus.ACTIVE,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: {
      shopId?: string;
      status?: ListingStatus;
    },
  ): Promise<Listing[]> {
    return this.prisma.listing.findMany({
      where: {
        tenantId,
        shopId: filters?.shopId,
        status: filters?.status || ListingStatus.ACTIVE,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Listing | null> {
    return this.prisma.listing.findFirst({
      where: { id, tenantId },
      include: {
        shop: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findByShop(shopId: string, tenantId: string): Promise<Listing[]> {
    return this.prisma.listing.findMany({
      where: { shopId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    tenantId: string,
    userId: string,
    data: UpdateListingDto,
  ): Promise<Listing> {
    const listing = await this.findById(id, tenantId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Verify user owns the shop
    if (listing.shop.ownerUserId !== userId) {
      throw new ForbiddenException(
        'You can only update your own listings',
      );
    }

    return this.prisma.listing.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: ListingStatus,
  ): Promise<Listing> {
    const listing = await this.findById(id, tenantId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.prisma.listing.update({
      where: { id },
      data: { status },
    });
  }

  async decrementStock(id: string, quantity: number): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.stockQty !== null && listing.stockQty < quantity) {
      throw new ForbiddenException('Insufficient stock');
    }

    if (listing.stockQty !== null) {
      await this.prisma.listing.update({
        where: { id },
        data: {
          stockQty: listing.stockQty - quantity,
        },
      });
    }
  }
}
