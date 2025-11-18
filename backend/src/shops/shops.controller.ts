import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ShopStatus } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.TENANT_ADMIN)
  async create(
    @Request() req,
    @CurrentUser() user,
    @Body() body: CreateShopDto,
  ) {
    return this.shopsService.create(req.tenantId, user.userId, body);
  }

  @Get()
  @Public()
  async findAll(@Request() req) {
    return this.shopsService.findAll(req.tenantId);
  }

  @Get('my-shops')
  @UseGuards(JwtAuthGuard)
  async findMyShops(@Request() req, @CurrentUser() user) {
    return this.shopsService.findByOwner(req.tenantId, user.userId);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string, @Request() req) {
    return this.shopsService.findById(id, req.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.TENANT_ADMIN)
  async update(
    @Param('id') id: string,
    @Request() req,
    @CurrentUser() user,
    @Body() body: UpdateShopDto,
  ) {
    return this.shopsService.update(id, req.tenantId, user.userId, body);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { status: ShopStatus },
  ) {
    return this.shopsService.updateStatus(id, req.tenantId, body.status);
  }
}
