import {
  Controller,
  Post,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Request() req,
    @Body()
    body: {
      email: string;
      password: string;
      role?: UserRole;
    },
  ) {
    const tenantId = req.tenantId;
    return this.authService.register(
      tenantId,
      body.email,
      body.password,
      body.role,
    );
  }

  @Post('login')
  async login(
    @Request() req,
    @Body() body: { email: string; password: string },
  ) {
    const tenantId = req.tenantId;
    const user = await this.authService.validateUser(
      tenantId,
      body.email,
      body.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }
}
