import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
