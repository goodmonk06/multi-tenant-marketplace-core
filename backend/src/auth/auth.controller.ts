import {
  Controller,
  Post,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Request() req, @Body() body: RegisterDto) {
    const tenantId = req.tenantId;
    return this.authService.register(
      tenantId,
      body.email,
      body.password,
      body.role,
    );
  }

  @Post('login')
  async login(@Request() req, @Body() body: LoginDto) {
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
