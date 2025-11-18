import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Order, OrderStatus } from '@prisma/client';
import { ListingsService } from '../listings/listings.service';
import { CartService } from '../cart/cart.service';

export interface CreateOrderDto {
  items: Array<{
    listingId: string;
    quantity: number;
  }>;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private listingsService: ListingsService,
    private cartService: CartService,
  ) {}

  async create(
    tenantId: string,
    buyerId: string,
    data: CreateOrderDto,
  ): Promise<Order> {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Calculate total and validate listings
    let totalPrice = 0;
    const orderItems = [];

    for (const item of data.items) {
      const listing = await this.listingsService.findById(
        item.listingId,
        tenantId,
      );
      if (!listing) {
        throw new NotFoundException(`Listing ${item.listingId} not found`);
      }

      if (listing.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Listing ${listing.title} is not available`,
        );
      }

      if (
        listing.stockQty !== null &&
        listing.stockQty < item.quantity
      ) {
        throw new BadRequestException(
          `Insufficient stock for ${listing.title}`,
        );
      }

      totalPrice += listing.price * item.quantity;
      orderItems.push({
        listingId: item.listingId,
        quantity: item.quantity,
        unitPrice: listing.price,
        metaJson: {
          title: listing.title,
          shopId: listing.shopId,
          shopName: listing.shop.name,
        },
      });
    }

    // Create order with items
    const order = await this.prisma.order.create({
      data: {
        tenantId,
        buyerId,
        totalPrice,
        currency: 'usd',
        status: OrderStatus.PENDING,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            listing: true,
          },
        },
      },
    });

    return order;
  }

  async createFromCart(
    tenantId: string,
    buyerId: string,
  ): Promise<Order> {
    const sessionId = buyerId;
    const cart = await this.cartService.getCart(sessionId, tenantId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const orderData: CreateOrderDto = {
      items: cart.items.map((item) => ({
        listingId: item.listingId,
        quantity: item.quantity,
      })),
    };

    const order = await this.create(tenantId, buyerId, orderData);

    // Clear cart after creating order
    await this.cartService.clearCart(sessionId, tenantId);

    return order;
  }

  async findAll(
    tenantId: string,
    filters?: {
      buyerId?: string;
      status?: OrderStatus;
    },
  ): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        buyerId: filters?.buyerId,
        status: filters?.status,
      },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
          },
        },
        items: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Order | null> {
    return this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
          },
        },
        items: {
          include: {
            listing: {
              include: {
                shop: true,
              },
            },
          },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const order = await this.findById(id, tenantId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async updatePayment(
    id: string,
    paymentIntentId: string,
    status: OrderStatus,
  ): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: {
        paymentIntentId,
        paymentProvider: 'stripe',
        status,
      },
    });
  }

  async findByPaymentIntent(paymentIntentId: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { paymentIntentId },
    });
  }
}
