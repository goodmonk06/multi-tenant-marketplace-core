import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  async findAll(@Request() req) {
    return this.usersService.findAll(req.tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/role')
  @Roles(UserRole.TENANT_ADMIN)
  async updateRole(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { role: UserRole },
  ) {
    return this.usersService.updateRole(id, req.tenantId, body.role);
  }
}
