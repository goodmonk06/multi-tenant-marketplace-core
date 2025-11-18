import { IsInt, IsString, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class CreateReviewDto {
  @IsString()
  listingId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}

export interface ReviewResponseDto {
  id: string;
  listingId: string;
  orderId: string | null;
  userId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
  };
}

export interface ReviewStatsDto {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchaseCount: number;
}
