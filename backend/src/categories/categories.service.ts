import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto, SearchListingsDto, SearchResultDto } from './categories.dto';
import { logger } from '../lib/logger';
import { metrics } from '../lib/metrics';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new category
   */
  async createCategory(
    tenantId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // Check if slug is unique within tenant
    const existing = await this.prisma.category.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: dto.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    // If parentId provided, verify it exists
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: {
          id: dto.parentId,
          tenantId,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = await this.prisma.category.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        parent: true,
        _count: {
          select: {
            listings: true,
            children: true,
          },
        },
      },
    });

    logger.info('Category created', {
      categoryId: category.id,
      slug: category.slug,
      tenantId,
    });

    metrics.recordCounter('categories_created_total', 1, { tenantId });

    return this.mapToResponseDto(category);
  }

  /**
   * Get all categories (optionally filtered by parent)
   */
  async getCategories(
    tenantId: string,
    parentId?: string | null,
    includeInactive: boolean = false,
  ): Promise<CategoryResponseDto[]> {
    const where: Prisma.CategoryWhereInput = {
      tenantId,
      ...(parentId !== undefined && { parentId }),
      ...(!includeInactive && { isActive: true }),
    };

    const categories = await this.prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: {
          where: !includeInactive ? { isActive: true } : undefined,
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            listings: true,
            children: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map((cat) => this.mapToResponseDto(cat));
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getCategoryTree(tenantId: string): Promise<CategoryResponseDto[]> {
    // Get all root categories (no parent)
    const rootCategories = await this.getCategories(tenantId, null);

    // Recursively load children
    return Promise.all(
      rootCategories.map(async (cat) => {
        if (cat._count && cat._count.children > 0) {
          cat.children = await this.getCategoryChildren(tenantId, cat.id);
        }
        return cat;
      }),
    );
  }

  /**
   * Get children of a specific category recursively
   */
  private async getCategoryChildren(
    tenantId: string,
    categoryId: string,
  ): Promise<CategoryResponseDto[]> {
    const children = await this.getCategories(tenantId, categoryId);

    return Promise.all(
      children.map(async (child) => {
        if (child._count && child._count.children > 0) {
          child.children = await this.getCategoryChildren(tenantId, child.id);
        }
        return child;
      }),
    );
  }

  /**
   * Get category by ID
   */
  async getCategoryById(
    tenantId: string,
    categoryId: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId,
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            listings: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponseDto(category);
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(
    tenantId: string,
    slug: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug,
        },
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            listings: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponseDto(category);
  }

  /**
   * Update a category
   */
  async updateCategory(
    tenantId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // If updating slug, check uniqueness
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: {
          tenantId_slug: {
            tenantId,
            slug: dto.slug,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Category slug already exists');
      }
    }

    // If updating parent, verify it's not a circular reference
    if (dto.parentId) {
      if (dto.parentId === categoryId) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      // Check if the new parent is a descendant of this category
      const isDescendant = await this.isDescendant(tenantId, categoryId, dto.parentId);
      if (isDescendant) {
        throw new BadRequestException('Cannot set descendant as parent (circular reference)');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            listings: true,
            children: true,
          },
        },
      },
    });

    logger.info('Category updated', {
      categoryId,
      tenantId,
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete a category
   */
  async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId,
      },
      include: {
        _count: {
          select: {
            listings: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.children > 0) {
      throw new BadRequestException('Cannot delete category with subcategories');
    }

    if (category._count.listings > 0) {
      throw new BadRequestException('Cannot delete category with listings');
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    logger.info('Category deleted', {
      categoryId,
      tenantId,
    });
  }

  /**
   * Search listings with filters
   */
  async searchListings(
    tenantId: string,
    dto: SearchListingsDto,
  ): Promise<SearchResultDto> {
    const {
      query,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = dto;

    // Build where clause
    const where: Prisma.ListingWhereInput = {
      tenantId,
      status: 'ACTIVE',
    };

    // Text search
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Category filter (including subcategories)
    if (categoryId) {
      const categoryIds = await this.getAllCategoryIds(tenantId, categoryId);
      where.categories = {
        some: {
          categoryId: {
            in: categoryIds,
          },
        },
      };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Execute query
    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
            },
          },
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this.prisma.listing.count({ where }),
    ]);

    logger.info('Listings searched', {
      query,
      categoryId,
      resultsCount: listings.length,
      totalCount: total,
      tenantId,
    });

    metrics.recordCounter('search_queries_total', 1, { tenantId });

    return {
      listings,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get all category IDs including descendants
   */
  private async getAllCategoryIds(
    tenantId: string,
    categoryId: string,
  ): Promise<string[]> {
    const ids: string[] = [categoryId];
    const children = await this.prisma.category.findMany({
      where: {
        tenantId,
        parentId: categoryId,
      },
      select: { id: true },
    });

    for (const child of children) {
      const childIds = await this.getAllCategoryIds(tenantId, child.id);
      ids.push(...childIds);
    }

    return ids;
  }

  /**
   * Check if categoryId is a descendant of potentialAncestorId
   */
  private async isDescendant(
    tenantId: string,
    potentialAncestorId: string,
    categoryId: string,
  ): Promise<boolean> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId,
      },
    });

    if (!category || !category.parentId) {
      return false;
    }

    if (category.parentId === potentialAncestorId) {
      return true;
    }

    return this.isDescendant(tenantId, potentialAncestorId, category.parentId);
  }

  private mapToResponseDto(category: any): CategoryResponseDto {
    return {
      id: category.id,
      tenantId: category.tenantId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      ...(category.parent && { parent: this.mapToResponseDto(category.parent) }),
      ...(category.children && {
        children: category.children.map((c: any) => this.mapToResponseDto(c)),
      }),
      ...(category._count && { _count: category._count }),
    };
  }
}
