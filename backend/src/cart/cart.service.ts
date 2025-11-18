import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingsService } from '../listings/listings.service';
import { CartItem } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private listingsService: ListingsService,
  ) {}

  async addItem(
    sessionId: string,
    tenantId: string,
    listingId: string,
    quantity: number,
  ): Promise<CartItem> {
    // Verify listing exists
    const listing = await this.listingsService.findById(listingId, tenantId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check if item already in cart
    const existing = await this.prisma.cartItem.findUnique({
      where: {
        sessionId_listingId: {
          sessionId,
          listingId,
        },
      },
    });

    if (existing) {
      // Update quantity
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    }

    // Create new cart item
    return this.prisma.cartItem.create({
      data: {
        sessionId,
        tenantId,
        listingId,
        quantity,
      },
    });
  }

  async getCart(sessionId: string, tenantId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { sessionId, tenantId },
      include: {
        listing: {
          include: {
            shop: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const total = items.reduce(
      (sum, item) => sum + item.listing.price * item.quantity,
      0,
    );

    return {
      items,
      total,
      currency: items[0]?.listing.currency || 'usd',
    };
  }

  async updateQuantity(
    id: string,
    sessionId: string,
    quantity: number,
  ): Promise<CartItem> {
    return this.prisma.cartItem.update({
      where: { id, sessionId },
      data: { quantity },
    });
  }

  async removeItem(id: string, sessionId: string): Promise<void> {
    await this.prisma.cartItem.delete({
      where: { id, sessionId },
    });
  }

  async clearCart(sessionId: string, tenantId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { sessionId, tenantId },
    });
  }
}
