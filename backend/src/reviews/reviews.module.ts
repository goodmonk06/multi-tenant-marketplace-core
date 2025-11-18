import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
