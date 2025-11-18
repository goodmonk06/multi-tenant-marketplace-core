import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip tenant validation for certain routes
    const skipRoutes = ['/tenants', '/health'];
    if (skipRoutes.some((route) => req.path.startsWith(route))) {
      return next();
    }

    // Get tenant from header (X-Tenant-Slug)
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    if (!tenantSlug) {
      throw new BadRequestException(
        'Tenant slug is required. Provide X-Tenant-Slug header.',
      );
    }

    // Validate tenant exists
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new BadRequestException(`Tenant '${tenantSlug}' not found`);
    }

    // Attach tenant context to request
    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;

    next();
  }
}
