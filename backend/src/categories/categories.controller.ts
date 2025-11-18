import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  SearchListingsDto,
  SearchResultDto,
} from './categories.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Create a new category (admin only)
   * POST /categories
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createCategory(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const tenantId = req.tenantId;

    // Only admins can create categories
    if (req.user.role !== UserRole.TENANT_ADMIN) {
      throw new Error('Only admins can create categories');
    }

    return this.categoriesService.createCategory(tenantId, dto);
  }

  /**
   * Get all categories
   * GET /categories
   */
  @Get()
  async getCategories(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Query('parentId') parentId?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<CategoryResponseDto[]> {
    const tenantId = req.tenantId;
    const includeInactiveBool = includeInactive === 'true';

    return this.categoriesService.getCategories(
      tenantId,
      parentId === 'null' ? null : parentId,
      includeInactiveBool,
    );
  }

  /**
   * Get category tree (hierarchical)
   * GET /categories/tree
   */
  @Get('tree')
  async getCategoryTree(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
  ): Promise<CategoryResponseDto[]> {
    const tenantId = req.tenantId;

    return this.categoriesService.getCategoryTree(tenantId);
  }

  /**
   * Search listings with filters
   * GET /categories/search
   */
  @Get('search')
  async searchListings(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Query('query') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: 'price' | 'createdAt' | 'title',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SearchResultDto> {
    const tenantId = req.tenantId;

    const searchDto: SearchListingsDto = {
      query,
      categoryId,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
      sortBy,
      sortOrder,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.categoriesService.searchListings(tenantId, searchDto);
  }

  /**
   * Get category by ID
   * GET /categories/:id
   */
  @Get(':id')
  async getCategoryById(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('id') categoryId: string,
  ): Promise<CategoryResponseDto> {
    const tenantId = req.tenantId;

    return this.categoriesService.getCategoryById(tenantId, categoryId);
  }

  /**
   * Get category by slug
   * GET /categories/slug/:slug
   */
  @Get('slug/:slug')
  async getCategoryBySlug(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('slug') slug: string,
  ): Promise<CategoryResponseDto> {
    const tenantId = req.tenantId;

    return this.categoriesService.getCategoryBySlug(tenantId, slug);
  }

  /**
   * Update a category (admin only)
   * PUT /categories/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateCategory(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('id') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const tenantId = req.tenantId;

    // Only admins can update categories
    if (req.user.role !== UserRole.TENANT_ADMIN) {
      throw new Error('Only admins can update categories');
    }

    return this.categoriesService.updateCategory(tenantId, categoryId, dto);
  }

  /**
   * Delete a category (admin only)
   * DELETE /categories/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('id') categoryId: string,
  ): Promise<void> {
    const tenantId = req.tenantId;

    // Only admins can delete categories
    if (req.user.role !== UserRole.TENANT_ADMIN) {
      throw new Error('Only admins can delete categories');
    }

    await this.categoriesService.deleteCategory(tenantId, categoryId);
  }
}
