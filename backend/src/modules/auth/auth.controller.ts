import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RbacService } from '../rbac/rbac.service';

/**
 * Credential-checking routes are limited well below the global ceiling.
 *
 * 20 attempts per minute per IP still allows a shared office or a NAT'd mobile
 * network to sign in normally, while making an online password search
 * impractical. It is not a substitute for per-account lockout, which remains
 * the stronger control and is not implemented yet.
 */
const AUTH_RATE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RbacService,
  ) {}

  @Post('login')
  @Throttle(AUTH_RATE_LIMIT)
  async login(@Body() body: any) {
    const identifier = body.identifier ?? body.email ?? body.phone;
    return this.authService.login(identifier, body.password);
  }

  @Post('register')
  @Throttle(AUTH_RATE_LIMIT)
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('validate')
  @Throttle(AUTH_RATE_LIMIT)
  async validate(@Body() body: any) {
    return this.authService.validateToken(body.token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    if (req.user?.type === 'customer' || req.user?.roleSlug === 'customer-account') {
      return {
        user: req.user,
        roles: [],
        permissions: [],
      };
    }

    const userId = req.user.id;
    const [permissions, roles] = await Promise.all([
      this.rbacService.getUserPermissions(userId),
      this.rbacService.getUserRoles(userId),
    ]);

    return {
      user: req.user,
      roles: roles.map(r => ({ id: r.id, name: r.name, slug: r.slug })),
      permissions: permissions.map(p => ({ id: p.id, slug: p.slug, name: p.name })),
    };
  }
}
