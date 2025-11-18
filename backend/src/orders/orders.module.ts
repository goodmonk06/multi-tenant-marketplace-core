import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ListingsModule } from '../listings/listings.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [ListingsModule, CartModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
