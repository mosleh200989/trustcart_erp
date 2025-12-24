import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'trustcart-erp-secret-key-2024',
    });
  }

  async validate(payload: any) {
    // Payload contains the decoded JWT data
    // { id: number, email: string, iat: number, exp: number }
    
    if (!payload.id) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user object - this will be available as req.user
    return {
      id: payload.id,
      email: payload.email,
      username: payload.username,
    };
  }
}
