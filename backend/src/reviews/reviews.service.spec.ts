import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, ReviewStatus, UserRole } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './reviews.dto';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: PrismaClient;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockListingId = 'listing-123';
  const mockOrderId = 'order-123';
  const mockReviewId = 'review-123';

  const mockListing = {
    id: mockListingId,
    tenantId: mockTenantId,
    shopId: 'shop-123',
    title: 'Test Listing',
    description: 'Test description',
    status: 'ACTIVE',
    price: 1000,
    currency: 'usd',
    stockQty: 10,
    attributesJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: mockUserId,
    tenantId: mockTenantId,
    email: 'test@example.com',
    passwordHash: 'hash',
    role: UserRole.BUYER,
    profileJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReview = {
    id: mockReviewId,
    tenantId: mockTenantId,
    listingId: mockListingId,
    orderId: mockOrderId,
    userId: mockUserId,
    rating: 5,
    title: 'Great product',
    comment: 'Really enjoyed this',
    status: ReviewStatus.PENDING,
    isVerified: true,
    helpfulCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: mockUserId,
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaClient,
          useValue: {
            listing: {
              findFirst: jest.fn(),
            },
            review: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            order: {
              findFirst: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    const createDto: CreateReviewDto = {
      listingId: mockListingId,
      orderId: mockOrderId,
      rating: 5,
      title: 'Great product',
      comment: 'Really enjoyed this',
    };

    it('should create a review successfully', async () => {
      jest.spyOn(prisma.listing, 'findFirst').mockResolvedValue(mockListing);
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue({
        id: mockOrderId,
        tenantId: mockTenantId,
        buyerId: mockUserId,
        totalPrice: 1000,
        currency: 'usd',
        status: 'PAYMENT_SUCCEEDED',
        paymentProvider: 'stripe',
        paymentIntentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      jest.spyOn(prisma.review, 'create').mockResolvedValue(mockReview as any);

      const result = await service.createReview(mockTenantId, mockUserId, createDto);

      expect(result.id).toBe(mockReviewId);
      expect(result.rating).toBe(5);
      expect(result.isVerified).toBe(true);
      expect(prisma.review.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if listing does not exist', async () => {
      jest.spyOn(prisma.listing, 'findFirst').mockResolvedValue(null);

      await expect(
        service.createReview(mockTenantId, mockUserId, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user already reviewed this listing', async () => {
      jest.spyOn(prisma.listing, 'findFirst').mockResolvedValue(mockListing);
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(mockReview as any);

      await expect(
        service.createReview(mockTenantId, mockUserId, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create unverified review if no orderId provided', async () => {
      const dtoWithoutOrder: CreateReviewDto = {
        listingId: mockListingId,
        rating: 4,
      };

      jest.spyOn(prisma.listing, 'findFirst').mockResolvedValue(mockListing);
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.review, 'create').mockResolvedValue({
        ...mockReview,
        isVerified: false,
        orderId: null,
      } as any);

      const result = await service.createReview(
        mockTenantId,
        mockUserId,
        dtoWithoutOrder,
      );

      expect(result.isVerified).toBe(false);
    });
  });

  describe('getListingReviews', () => {
    it('should return reviews for a listing', async () => {
      jest.spyOn(prisma.review, 'findMany').mockResolvedValue([mockReview] as any);

      const result = await service.getListingReviews(
        mockTenantId,
        mockListingId,
        ReviewStatus.APPROVED,
      );

      expect(result).toHaveLength(1);
      expect(result[0].listingId).toBe(mockListingId);
    });

    it('should apply pagination correctly', async () => {
      jest.spyOn(prisma.review, 'findMany').mockResolvedValue([]);

      await service.getListingReviews(mockTenantId, mockListingId, undefined, 10, 5);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('getListingStats', () => {
    it('should calculate review statistics correctly', async () => {
      const mockReviews = [
        { rating: 5, isVerified: true },
        { rating: 4, isVerified: true },
        { rating: 5, isVerified: false },
        { rating: 3, isVerified: false },
      ];

      jest.spyOn(prisma.review, 'findMany').mockResolvedValue(mockReviews as any);

      const stats = await service.getListingStats(mockTenantId, mockListingId);

      expect(stats.totalReviews).toBe(4);
      expect(stats.averageRating).toBe(4.2); // (5+4+5+3)/4 = 4.25 -> 4.2 rounded
      expect(stats.ratingDistribution[5]).toBe(2);
      expect(stats.ratingDistribution[4]).toBe(1);
      expect(stats.ratingDistribution[3]).toBe(1);
      expect(stats.verifiedPurchaseCount).toBe(2);
    });

    it('should return zero stats when no reviews exist', async () => {
      jest.spyOn(prisma.review, 'findMany').mockResolvedValue([]);

      const stats = await service.getListingStats(mockTenantId, mockListingId);

      expect(stats.totalReviews).toBe(0);
      expect(stats.averageRating).toBe(0);
      expect(stats.verifiedPurchaseCount).toBe(0);
    });
  });

  describe('moderateReview', () => {
    it('should allow admin to moderate review', async () => {
      const adminUser = { ...mockUser, role: UserRole.TENANT_ADMIN };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(adminUser as any);
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(mockReview as any);
      jest.spyOn(prisma.review, 'update').mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.APPROVED,
      } as any);

      const result = await service.moderateReview(
        mockTenantId,
        mockUserId,
        mockReviewId,
        ReviewStatus.APPROVED,
      );

      expect(result.status).toBe(ReviewStatus.APPROVED);
    });

    it('should throw ForbiddenException if non-admin tries to moderate', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(mockReview as any);

      await expect(
        service.moderateReview(
          mockTenantId,
          mockUserId,
          mockReviewId,
          ReviewStatus.APPROVED,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markHelpful', () => {
    it('should increment helpful count', async () => {
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(mockReview as any);
      jest.spyOn(prisma.review, 'update').mockResolvedValue({
        ...mockReview,
        helpfulCount: 1,
      } as any);

      const result = await service.markHelpful(mockTenantId, mockReviewId);

      expect(result.helpfulCount).toBe(1);
      expect(prisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            helpfulCount: {
              increment: 1,
            },
          },
        }),
      );
    });
  });

  describe('deleteReview', () => {
    it('should allow user to delete their own review', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(mockReview as any);
      jest.spyOn(prisma.review, 'delete').mockResolvedValue(mockReview as any);

      await service.deleteReview(mockTenantId, mockUserId, mockReviewId);

      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { id: mockReviewId },
      });
    });

    it('should allow admin to delete any review', async () => {
      const adminUser = { ...mockUser, role: UserRole.TENANT_ADMIN };
      const otherUserReview = { ...mockReview, userId: 'other-user' };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(adminUser as any);
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(otherUserReview as any);
      jest.spyOn(prisma.review, 'delete').mockResolvedValue(otherUserReview as any);

      await service.deleteReview(mockTenantId, mockUserId, mockReviewId);

      expect(prisma.review.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if non-owner tries to delete', async () => {
      const otherUserReview = { ...mockReview, userId: 'other-user' };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.review, 'findFirst').mockResolvedValue(otherUserReview as any);

      await expect(
        service.deleteReview(mockTenantId, mockUserId, mockReviewId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
