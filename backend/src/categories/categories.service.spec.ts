import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaClient;

  const mockTenantId = 'tenant-123';
  const mockCategoryId = 'category-123';
  const mockParentId = 'parent-123';

  const mockCategory = {
    id: mockCategoryId,
    tenantId: mockTenantId,
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic items',
    parentId: null,
    imageUrl: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    parent: null,
    children: [],
    _count: {
      listings: 5,
      children: 2,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaClient,
          useValue: {
            category: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            listing: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    const createDto: CreateCategoryDto = {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic items',
      sortOrder: 0,
    };

    it('should create a category successfully', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.category, 'create').mockResolvedValue(mockCategory as any);

      const result = await service.createCategory(mockTenantId, createDto);

      expect(result.id).toBe(mockCategoryId);
      expect(result.name).toBe('Electronics');
      expect(prisma.category.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockCategory as any);

      await expect(
        service.createCategory(mockTenantId, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a category with parent', async () => {
      const dtoWithParent: CreateCategoryDto = {
        ...createDto,
        parentId: mockParentId,
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue({
        ...mockCategory,
        id: mockParentId,
      } as any);
      jest.spyOn(prisma.category, 'create').mockResolvedValue({
        ...mockCategory,
        parentId: mockParentId,
      } as any);

      const result = await service.createCategory(mockTenantId, dtoWithParent);

      expect(result.parentId).toBe(mockParentId);
    });

    it('should throw NotFoundException if parent does not exist', async () => {
      const dtoWithParent: CreateCategoryDto = {
        ...createDto,
        parentId: mockParentId,
      };

      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(null);

      await expect(
        service.createCategory(mockTenantId, dtoWithParent),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should return all active categories', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([mockCategory] as any);

      const result = await service.getCategories(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
    });

    it('should filter by parentId', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      await service.getCategories(mockTenantId, mockParentId);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: mockParentId,
          }),
        }),
      );
    });

    it('should include inactive categories when requested', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);

      await service.getCategories(mockTenantId, undefined, true);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isActive: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('getCategoryById', () => {
    it('should return category by ID', async () => {
      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory as any);

      const result = await service.getCategoryById(mockTenantId, mockCategoryId);

      expect(result.id).toBe(mockCategoryId);
      expect(result.name).toBe('Electronics');
    });

    it('should throw NotFoundException if category does not exist', async () => {
      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(null);

      await expect(
        service.getCategoryById(mockTenantId, mockCategoryId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategoryBySlug', () => {
    it('should return category by slug', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(mockCategory as any);

      const result = await service.getCategoryBySlug(mockTenantId, 'electronics');

      expect(result.slug).toBe('electronics');
    });

    it('should throw NotFoundException if category does not exist', async () => {
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getCategoryBySlug(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCategory', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Electronics',
      sortOrder: 10,
    };

    it('should update a category successfully', async () => {
      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory as any);
      jest.spyOn(prisma.category, 'update').mockResolvedValue({
        ...mockCategory,
        name: 'Updated Electronics',
        sortOrder: 10,
      } as any);

      const result = await service.updateCategory(
        mockTenantId,
        mockCategoryId,
        updateDto,
      );

      expect(result.name).toBe('Updated Electronics');
      expect(result.sortOrder).toBe(10);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(null);

      await expect(
        service.updateCategory(mockTenantId, mockCategoryId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new slug already exists', async () => {
      const dtoWithSlug: UpdateCategoryDto = {
        slug: 'existing-slug',
      };

      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory as any);
      jest.spyOn(prisma.category, 'findUnique').mockResolvedValue({
        ...mockCategory,
        id: 'other-id',
      } as any);

      await expect(
        service.updateCategory(mockTenantId, mockCategoryId, dtoWithSlug),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for circular parent reference', async () => {
      const dtoWithParent: UpdateCategoryDto = {
        parentId: mockCategoryId, // Same as category ID
      };

      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory as any);

      await expect(
        service.updateCategory(mockTenantId, mockCategoryId, dtoWithParent),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      const emptyCategory = {
        ...mockCategory,
        _count: {
          listings: 0,
          children: 0,
        },
      };

      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(emptyCategory as any);
      jest.spyOn(prisma.category, 'delete').mockResolvedValue(emptyCategory as any);

      await service.deleteCategory(mockTenantId, mockCategoryId);

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
      });
    });

    it('should throw BadRequestException if category has children', async () => {
      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory as any);

      await expect(
        service.deleteCategory(mockTenantId, mockCategoryId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if category has listings', async () => {
      const categoryWithListings = {
        ...mockCategory,
        _count: {
          listings: 5,
          children: 0,
        },
      };

      jest.spyOn(prisma.category, 'findFirst').mockResolvedValue(
        categoryWithListings as any,
      );

      await expect(
        service.deleteCategory(mockTenantId, mockCategoryId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('searchListings', () => {
    const mockListings = [
      {
        id: 'listing-1',
        title: 'Test Product',
        price: 1000,
        shop: { id: 'shop-1', name: 'Test Shop' },
        categories: [],
        _count: { reviews: 0 },
      },
    ];

    it('should search listings with text query', async () => {
      jest.spyOn(prisma.listing, 'findMany').mockResolvedValue(mockListings as any);
      jest.spyOn(prisma.listing, 'count').mockResolvedValue(1);

      const result = await service.searchListings(mockTenantId, {
        query: 'test',
        limit: 20,
        offset: 0,
      });

      expect(result.listings).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by category including subcategories', async () => {
      jest.spyOn(prisma.category, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.listing, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.listing, 'count').mockResolvedValue(0);

      await service.searchListings(mockTenantId, {
        categoryId: mockCategoryId,
      });

      expect(prisma.category.findMany).toHaveBeenCalled();
    });

    it('should filter by price range', async () => {
      jest.spyOn(prisma.listing, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.listing, 'count').mockResolvedValue(0);

      await service.searchListings(mockTenantId, {
        minPrice: 100,
        maxPrice: 500,
      });

      expect(prisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: {
              gte: 100,
              lte: 500,
            },
          }),
        }),
      );
    });

    it('should apply sorting correctly', async () => {
      jest.spyOn(prisma.listing, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.listing, 'count').mockResolvedValue(0);

      await service.searchListings(mockTenantId, {
        sortBy: 'price',
        sortOrder: 'asc',
      });

      expect(prisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        }),
      );
    });
  });
});
