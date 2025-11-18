import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(req: any, email: string, password: string): Promise<any> {
    const tenantId = req.tenantId;
    const user = await this.authService.validateUser(tenantId, email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
