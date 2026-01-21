import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { RbacService } from '../../modules/rbac/rbac.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

const CUSTOMER_ACCOUNT_SLUG = 'customer-account';
const CUSTOMER_BUILTIN_PERMISSIONS = new Set<string>([
  // Customer self-service endpoints
  'view-own-wallet',
  'share-referral-link',
]);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef
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

    const rbacService = this.moduleRef.get(RbacService, { strict: false });
    if (!rbacService) {
      throw new UnauthorizedException('RBAC service not available');
    }

    // Customer portal uses customer-account identity; those users may not have RBAC rows in user_roles.
    // Allow a small, explicit set of self-service permissions without hitting RBAC.
    const isCustomerAccount =
      user?.type === 'customer' || String(user?.roleSlug || '') === CUSTOMER_ACCOUNT_SLUG;

    // Check if user has all required permissions
    for (const permission of requiredPermissions) {
      if (isCustomerAccount && CUSTOMER_BUILTIN_PERMISSIONS.has(String(permission))) {
        continue;
      }

      const hasPermission = await rbacService.checkPermission(user.id, permission);
      if (!hasPermission) {
        console.log(`User ${user.id} (${user.email}) missing permission: ${permission}`);
        throw new ForbiddenException(`Missing required permission: ${permission}`);
      }
    }

    return true;
  }
}
