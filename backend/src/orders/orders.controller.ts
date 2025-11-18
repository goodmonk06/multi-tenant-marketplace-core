import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Request() req,
    @CurrentUser() user,
    @Body() body: CreateOrderDto,
  ) {
    return this.ordersService.create(req.tenantId, user.userId, body);
  }

  @Post('from-cart')
  async createFromCart(@Request() req, @CurrentUser() user) {
    return this.ordersService.createFromCart(req.tenantId, user.userId);
  }

  @Get()
  async findAll(
    @Request() req,
    @CurrentUser() user,
    @Query('status') status?: OrderStatus,
  ) {
    // Buyers see only their orders, admins see all
    const filters: any = { status };
    if (user.role === UserRole.BUYER) {
      filters.buyerId = user.userId;
    }

    return this.ordersService.findAll(req.tenantId, filters);
  }

  @Get('my-orders')
  async myOrders(
    @Request() req,
    @CurrentUser() user,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAll(req.tenantId, {
      buyerId: user.userId,
      status,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.ordersService.findById(id, req.tenantId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SELLER)
  async updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { status: OrderStatus },
  ) {
    return this.ordersService.updateStatus(id, req.tenantId, body.status);
  }
}
