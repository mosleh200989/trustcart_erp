import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RbacService } from '../rbac/rbac.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RbacService,
  ) {}

  @Post('login')
  async login(@Body() body: any, @Request() req: any) {
    const identifier = body.identifier ?? body.email ?? body.phone;
    // The request carries the device and IP recorded on the login session.
    return this.authService.login(identifier, body.password, req);
  }

  @Post('register')
  async register(@Body() body: any, @Request() req: any) {
    return this.authService.register(body, req);
  }

  /** Ends this device's session so it stops counting as signed in. */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    return this.authService.logout(req.user?.sessionKey);
  }

  @Post('validate')
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
