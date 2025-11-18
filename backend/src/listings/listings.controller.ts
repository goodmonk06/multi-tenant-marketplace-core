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
import { ListingsService, CreateListingDto, UpdateListingDto } from './listings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, ListingStatus } from '@prisma/client';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.TENANT_ADMIN)
  async create(
    @Request() req,
    @CurrentUser() user,
    @Body() body: CreateListingDto,
  ) {
    return this.listingsService.create(req.tenantId, user.userId, body);
  }

  @Get()
  @Public()
  async findAll(
    @Request() req,
    @Query('shopId') shopId?: string,
    @Query('status') status?: ListingStatus,
  ) {
    return this.listingsService.findAll(req.tenantId, { shopId, status });
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string, @Request() req) {
    return this.listingsService.findById(id, req.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.TENANT_ADMIN)
  async update(
    @Param('id') id: string,
    @Request() req,
    @CurrentUser() user,
    @Body() body: UpdateListingDto,
  ) {
    return this.listingsService.update(id, req.tenantId, user.userId, body);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SELLER)
  async updateStatus(
    @Param('id') id: string,
    @Request() req,
    @CurrentUser() user,
    @Body() body: { status: ListingStatus },
  ) {
    // Allow sellers to update their own listings, or admins to update any
    const listing = await this.listingsService.findById(id, req.tenantId);
    if (user.role !== UserRole.TENANT_ADMIN && listing?.shop.ownerUserId !== user.userId) {
      return this.listingsService.updateStatus(id, req.tenantId, body.status);
    }

    return this.listingsService.updateStatus(id, req.tenantId, body.status);
  }
}
