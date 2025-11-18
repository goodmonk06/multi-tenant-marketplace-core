import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, ReviewStatus, UserRole } from '@prisma/client';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto, ReviewStatsDto } from './reviews.dto';
import { logger } from '../lib/logger';
import { metrics } from '../lib/metrics';
import { eventBus } from '../lib/events/event-bus';
import { DomainEventType } from '../lib/events/types';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new review
   */
  async createReview(
    tenantId: string,
    userId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    // Verify the listing exists and belongs to the tenant
    const listing = await this.prisma.listing.findFirst({
      where: {
        id: dto.listingId,
        tenantId,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check if user already reviewed this listing
    const existingReview = await this.prisma.review.findFirst({
      where: {
        tenantId,
        userId,
        listingId: dto.listingId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this listing');
    }

    // If orderId is provided, verify it's a valid purchase by this user
    let isVerified = false;
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          tenantId,
          buyerId: userId,
          items: {
            some: {
              listingId: dto.listingId,
            },
          },
        },
      });

      if (order) {
        isVerified = true;
      } else {
        throw new BadRequestException('Invalid order or listing not in order');
      }
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        tenantId,
        userId,
        listingId: dto.listingId,
        orderId: dto.orderId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        isVerified,
        status: ReviewStatus.PENDING, // Default to pending for moderation
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    logger.info('Review created', {
      reviewId: review.id,
      listingId: dto.listingId,
      userId,
      rating: dto.rating,
      tenantId,
    });

    metrics.recordCounter('reviews_created_total', 1, { tenantId });

    // Publish domain event
    await eventBus.publish(
      DomainEventType.REVIEW_CREATED,
      tenantId,
      {
        reviewId: review.id,
        listingId: dto.listingId,
        userId,
        rating: dto.rating,
      },
      { userId },
    );

    return this.mapToResponseDto(review);
  }

  /**
   * Get reviews for a listing
   */
  async getListingReviews(
    tenantId: string,
    listingId: string,
    status?: ReviewStatus,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        tenantId,
        listingId,
        ...(status && { status }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return reviews.map((review) => this.mapToResponseDto(review));
  }

  /**
   * Get review statistics for a listing
   */
  async getListingStats(
    tenantId: string,
    listingId: string,
  ): Promise<ReviewStatsDto> {
    const reviews = await this.prisma.review.findMany({
      where: {
        tenantId,
        listingId,
        status: ReviewStatus.APPROVED, // Only count approved reviews
      },
      select: {
        rating: true,
        isVerified: true,
      },
    });

    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedPurchaseCount: 0,
      };
    }

    const sumRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = sumRating / totalReviews;

    const ratingDistribution = reviews.reduce(
      (dist, r) => {
        dist[r.rating as keyof typeof dist]++;
        return dist;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    );

    const verifiedPurchaseCount = reviews.filter((r) => r.isVerified).length;

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      ratingDistribution,
      verifiedPurchaseCount,
    };
  }

  /**
   * Update a review (only by the author)
   */
  async updateReview(
    tenantId: string,
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findFirst({
      where: {
        id: reviewId,
        tenantId,
        userId, // Ensure user owns this review
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found or access denied');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        status: ReviewStatus.PENDING, // Reset to pending on update
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    logger.info('Review updated', {
      reviewId,
      userId,
      tenantId,
    });

    await eventBus.publish(
      DomainEventType.REVIEW_UPDATED,
      tenantId,
      {
        reviewId: updated.id,
        listingId: updated.listingId,
        userId,
      },
      { userId },
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Moderate a review (admin only)
   */
  async moderateReview(
    tenantId: string,
    userId: string,
    reviewId: string,
    newStatus: ReviewStatus,
  ): Promise<ReviewResponseDto> {
    // Verify user is an admin
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user || user.role !== UserRole.TENANT_ADMIN) {
      throw new ForbiddenException('Only admins can moderate reviews');
    }

    const review = await this.prisma.review.findFirst({
      where: {
        id: reviewId,
        tenantId,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: newStatus,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    logger.info('Review moderated', {
      reviewId,
      newStatus,
      moderatorId: userId,
      tenantId,
    });

    await eventBus.publish(
      DomainEventType.REVIEW_MODERATED,
      tenantId,
      {
        reviewId: updated.id,
        listingId: updated.listingId,
        status: newStatus,
        moderatorId: userId,
      },
      { userId },
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(
    tenantId: string,
    reviewId: string,
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findFirst({
      where: {
        id: reviewId,
        tenantId,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount: {
          increment: 1,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete a review
   */
  async deleteReview(
    tenantId: string,
    userId: string,
    reviewId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Users can delete their own reviews, admins can delete any review
    if (review.userId !== userId && user?.role !== UserRole.TENANT_ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    logger.info('Review deleted', {
      reviewId,
      deletedBy: userId,
      tenantId,
    });
  }

  private mapToResponseDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      listingId: review.listingId,
      orderId: review.orderId,
      userId: review.userId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      isVerified: review.isVerified,
      helpfulCount: review.helpfulCount,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      ...(review.user && { user: review.user }),
    };
  }
}
