import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Shop, ShopStatus, UserRole } from '@prisma/client';

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  async create(
    tenantId: string,
    ownerUserId: string,
    data: {
      name: string;
      description?: string;
    },
  ): Promise<Shop> {
    // Verify user is a seller or admin
    const user = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
    });

    if (!user || user.tenantId !== tenantId) {
      throw new ForbiddenException('Invalid user');
    }

    if (user.role !== UserRole.SELLER && user.role !== UserRole.TENANT_ADMIN) {
      throw new ForbiddenException(
        'Only sellers and admins can create shops',
      );
    }

    return this.prisma.shop.create({
      data: {
        tenantId,
        ownerUserId,
        name: data.name,
        description: data.description,
        status: ShopStatus.ACTIVE,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string): Promise<Shop[]> {
    return this.prisma.shop.findMany({
      where: { tenantId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            listings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Shop | null> {
    return this.prisma.shop.findFirst({
      where: { id, tenantId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        listings: true,
      },
    });
  }

  async findByOwner(tenantId: string, ownerUserId: string): Promise<Shop[]> {
    return this.prisma.shop.findMany({
      where: { tenantId, ownerUserId },
      include: {
        _count: {
          select: {
            listings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    tenantId: string,
    ownerUserId: string,
    data: {
      name?: string;
      description?: string;
      status?: ShopStatus;
    },
  ): Promise<Shop> {
    const shop = await this.findById(id, tenantId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('You can only update your own shop');
    }

    return this.prisma.shop.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: ShopStatus,
  ): Promise<Shop> {
    const shop = await this.findById(id, tenantId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return this.prisma.shop.update({
      where: { id },
      data: { status },
    });
  }
}
