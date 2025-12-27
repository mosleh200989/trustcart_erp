import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../../modules/rbac/rbac.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user has all required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.rbacService.checkPermission(user.id, permission);
      if (!hasPermission) {
        console.log(`User ${user.id} (${user.email}) missing permission: ${permission}`);
        throw new ForbiddenException(`Missing required permission: ${permission}`);
      }
    }

    return true;
  }
}
