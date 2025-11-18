import { Controller, Get, Post, Body } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async findAll() {
    return this.tenantService.findAll();
  }

  @Post()
  async create(@Body() data: { name: string; slug: string }) {
    return this.tenantService.create(data);
  }
}
