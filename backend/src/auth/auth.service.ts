import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    tenantId: string,
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.usersService.findByEmail(tenantId, email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async register(
    tenantId: string,
    email: string,
    password: string,
    role: UserRole = UserRole.BUYER,
  ) {
    const user = await this.usersService.create({
      tenantId,
      email,
      password,
      role,
    });

    return this.login(user);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
