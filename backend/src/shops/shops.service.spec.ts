import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShopStatus, UserRole } from '@prisma/client';

describe('ShopsService', () => {
  let service: ShopsService;
  let prismaService: PrismaService;

  const mockShop = {
    id: 'shop-1',
    tenantId: 'tenant-1',
    ownerUserId: 'user-1',
    name: 'Test Shop',
    description: 'Test Description',
    status: ShopStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'seller@example.com',
    role: UserRole.SELLER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        {
          provide: PrismaService,
          useValue: {
            shop: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ShopsService>(ShopsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a shop for a valid seller', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.shop, 'create').mockResolvedValue(mockShop as any);

      const result = await service.create('tenant-1', 'user-1', {
        name: 'Test Shop',
        description: 'Test Description',
      });

      expect(result).toEqual(mockShop);
      expect(prismaService.shop.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          ownerUserId: 'user-1',
          name: 'Test Shop',
          description: 'Test Description',
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
    });

    it('should throw ForbiddenException for non-seller users', async () => {
      const buyerUser = { ...mockUser, role: UserRole.BUYER };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(buyerUser as any);

      await expect(
        service.create('tenant-1', 'user-1', {
          name: 'Test Shop',
          description: 'Test Description',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for user from different tenant', async () => {
      const differentTenantUser = { ...mockUser, tenantId: 'tenant-2' };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(differentTenantUser as any);

      await expect(
        service.create('tenant-1', 'user-1', {
          name: 'Test Shop',
          description: 'Test Description',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return all shops for a tenant', async () => {
      const mockShops = [mockShop];
      jest.spyOn(prismaService.shop, 'findMany').mockResolvedValue(mockShops as any);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(mockShops);
      expect(prismaService.shop.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
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
    });
  });

  describe('updateStatus', () => {
    it('should update shop status', async () => {
      const updatedShop = { ...mockShop, status: ShopStatus.SUSPENDED };
      jest.spyOn(prismaService.shop, 'findFirst').mockResolvedValue(mockShop as any);
      jest.spyOn(prismaService.shop, 'update').mockResolvedValue(updatedShop as any);

      const result = await service.updateStatus('shop-1', 'tenant-1', ShopStatus.SUSPENDED);

      expect(result).toEqual(updatedShop);
      expect(prismaService.shop.update).toHaveBeenCalledWith({
        where: { id: 'shop-1' },
        data: { status: ShopStatus.SUSPENDED },
      });
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      jest.spyOn(prismaService.shop, 'findFirst').mockResolvedValue(null);

      await expect(
        service.updateStatus('shop-1', 'tenant-1', ShopStatus.SUSPENDED),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
