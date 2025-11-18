import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Request() req, @CurrentUser() user) {
    const sessionId = user.userId; // Use user ID as session
    return this.cartService.getCart(sessionId, req.tenantId);
  }

  @Post('items')
  async addItem(
    @Request() req,
    @CurrentUser() user,
    @Body() body: { listingId: string; quantity: number },
  ) {
    const sessionId = user.userId;
    return this.cartService.addItem(
      sessionId,
      req.tenantId,
      body.listingId,
      body.quantity,
    );
  }

  @Patch('items/:id')
  async updateQuantity(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body() body: { quantity: number },
  ) {
    const sessionId = user.userId;
    return this.cartService.updateQuantity(id, sessionId, body.quantity);
  }

  @Delete('items/:id')
  async removeItem(@Param('id') id: string, @CurrentUser() user) {
    const sessionId = user.userId;
    return this.cartService.removeItem(id, sessionId);
  }

  @Delete()
  async clearCart(@Request() req, @CurrentUser() user) {
    const sessionId = user.userId;
    return this.cartService.clearCart(sessionId, req.tenantId);
  }
}
