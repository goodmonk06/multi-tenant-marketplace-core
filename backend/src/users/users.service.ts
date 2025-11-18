import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });
  }

  async findAll(tenantId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        role: true,
        profileJson: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        passwordHash: false,
      },
    });
  }

  async create(data: {
    tenantId: string;
    email: string;
    password: string;
    role?: UserRole;
    profileJson?: any;
  }): Promise<User> {
    // Check if user already exists
    const existing = await this.findByEmail(data.tenantId, data.email);
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        passwordHash,
        role: data.role || UserRole.BUYER,
        profileJson: data.profileJson,
      },
    });
  }

  async updateRole(
    userId: string,
    tenantId: string,
    role: UserRole,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId, tenantId },
      data: { role },
    });
  }
}
