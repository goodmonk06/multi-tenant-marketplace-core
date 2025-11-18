import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';
import { ListingStatus, ShopStatus } from '@prisma/client';

describe('ListingsService', () => {
  let service: ListingsService;
  let prismaService: PrismaService;
  let shopsService: ShopsService;

  const mockShop = {
    id: 'shop-1',
    tenantId: 'tenant-1',
    ownerUserId: 'user-1',
    name: 'Test Shop',
    description: 'Test Description',
    status: ShopStatus.ACTIVE,
  };

  const mockListing = {
    id: 'listing-1',
    tenantId: 'tenant-1',
    shopId: 'shop-1',
    title: 'Test Product',
    description: 'Test Description',
    status: ListingStatus.ACTIVE,
    price: 1999,
    currency: 'usd',
    stockQty: 10,
    attributesJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        {
          provide: PrismaService,
          useValue: {
            listing: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ShopsService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
    prismaService = module.get<PrismaService>(PrismaService);
    shopsService = module.get<ShopsService>(ShopsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a listing for shop owner', async () => {
      jest.spyOn(shopsService, 'findById').mockResolvedValue(mockShop as any);
      jest.spyOn(prismaService.listing, 'create').mockResolvedValue(mockListing as any);

      const result = await service.create('tenant-1', 'user-1', {
        shopId: 'shop-1',
        title: 'Test Product',
        description: 'Test Description',
        price: 1999,
        stockQty: 10,
      });

      expect(result).toEqual(mockListing);
      expect(prismaService.listing.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          shopId: 'shop-1',
          title: 'Test Product',
          description: 'Test Description',
          price: 1999,
          currency: 'usd',
          stockQty: 10,
          attributesJson: undefined,
          status: ListingStatus.ACTIVE,
        },
      });
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      jest.spyOn(shopsService, 'findById').mockResolvedValue(null);

      await expect(
        service.create('tenant-1', 'user-1', {
          shopId: 'shop-1',
          title: 'Test Product',
          price: 1999,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      jest.spyOn(shopsService, 'findById').mockResolvedValue(mockShop as any);

      await expect(
        service.create('tenant-1', 'user-2', {
          shopId: 'shop-1',
          title: 'Test Product',
          price: 1999,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('decrementStock', () => {
    it('should decrement stock for listing with available quantity', async () => {
      jest.spyOn(prismaService.listing, 'findUnique').mockResolvedValue(mockListing as any);
      jest.spyOn(prismaService.listing, 'update').mockResolvedValue({
        ...mockListing,
        stockQty: 8,
      } as any);

      await service.decrementStock('listing-1', 2);

      expect(prismaService.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { stockQty: 8 },
      });
    });

    it('should throw ForbiddenException for insufficient stock', async () => {
      jest.spyOn(prismaService.listing, 'findUnique').mockResolvedValue(mockListing as any);

      await expect(service.decrementStock('listing-1', 20)).rejects.toThrow(ForbiddenException);
    });

    it('should handle unlimited stock (null stockQty)', async () => {
      const unlimitedListing = { ...mockListing, stockQty: null };
      jest.spyOn(prismaService.listing, 'findUnique').mockResolvedValue(unlimitedListing as any);

      await service.decrementStock('listing-1', 100);

      expect(prismaService.listing.update).not.toHaveBeenCalled();
    });
  });
});
