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
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ModerateReviewDto,
  ReviewResponseDto,
  ReviewStatsDto,
} from './reviews.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewStatus } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Create a new review
   * POST /reviews
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const tenantId = req.tenantId;
    const userId = req.user.userId;

    return this.reviewsService.createReview(tenantId, userId, dto);
  }

  /**
   * Get reviews for a listing
   * GET /reviews/listing/:listingId
   */
  @Get('listing/:listingId')
  async getListingReviews(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('listingId') listingId: string,
    @Query('status') status?: ReviewStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ReviewResponseDto[]> {
    const tenantId = req.tenantId;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    // Non-authenticated users can only see approved reviews
    const effectiveStatus = req.user ? status : ReviewStatus.APPROVED;

    return this.reviewsService.getListingReviews(
      tenantId,
      listingId,
      effectiveStatus,
      parsedLimit,
      parsedOffset,
    );
  }

  /**
   * Get review statistics for a listing
   * GET /reviews/listing/:listingId/stats
   */
  @Get('listing/:listingId/stats')
  async getListingStats(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('listingId') listingId: string,
  ): Promise<ReviewStatsDto> {
    const tenantId = req.tenantId;

    return this.reviewsService.getListingStats(tenantId, listingId);
  }

  /**
   * Update a review
   * PUT /reviews/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateReview(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('id') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const tenantId = req.tenantId;
    const userId = req.user.userId;

    return this.reviewsService.updateReview(tenantId, userId, reviewId, dto);
  }

  /**
   * Moderate a review (admin only)
   * PUT /reviews/:id/moderate
   */
  @Put(':id/moderate')
  @UseGuards(JwtAuthGuard)
  async moderateReview(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('id') reviewId: string,
    @Body() dto: ModerateReviewDto,
  ): Promise<ReviewResponseDto> {
    const tenantId = req.tenantId;
    const userId = req.user.userId;

    return this.reviewsService.moderateReview(
      tenantId,
      userId,
      reviewId,
      dto.status,
    );
  }

  /**
   * Mark review as helpful
   * POST /reviews/:id/helpful
   */
  @Post(':id/helpful')
  @HttpCode(HttpStatus.OK)
  async markHelpful(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('id') reviewId: string,
  ): Promise<ReviewResponseDto> {
    const tenantId = req.tenantId;

    return this.reviewsService.markHelpful(tenantId, reviewId);
  }

  /**
   * Delete a review
   * DELETE /reviews/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Request() req: any,
    @Param('id') reviewId: string,
  ): Promise<void> {
    const tenantId = req.tenantId;
    const userId = req.user.userId;

    await this.reviewsService.deleteReview(tenantId, userId, reviewId);
  }
}
