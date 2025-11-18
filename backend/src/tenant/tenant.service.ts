import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({
      where: { slug },
    });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { name: string; slug: string }): Promise<Tenant> {
    return this.prisma.tenant.create({
      data,
    });
  }

  async validateTenantAccess(tenantId: string): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }
    return tenant;
  }
}
