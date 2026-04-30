import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { RbacService } from '../../modules/rbac/rbac.service';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY } from '../decorators/permissions.decorator';

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
    // AND-check: all listed permissions must be present
    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // OR-check: at least one listed permission must be present
    const requiredAny = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permission requirement on this route
    if (!requiredAll && !requiredAny) {
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

    // AND-check: every permission in the list must be present
    if (requiredAll && requiredAll.length > 0) {
      for (const permission of requiredAll) {
        if (isCustomerAccount && CUSTOMER_BUILTIN_PERMISSIONS.has(String(permission))) {
          continue;
        }

        const hasPermission = await rbacService.checkPermission(user.id, permission);
        if (!hasPermission) {
          console.log(`User ${user.id} (${user.email}) missing permission: ${permission}`);
          throw new ForbiddenException(`Missing required permission: ${permission}`);
        }
      }
    }

    // OR-check: at least one permission in the list must be present
    if (requiredAny && requiredAny.length > 0) {
      let hasAny = false;
      for (const permission of requiredAny) {
        if (isCustomerAccount && CUSTOMER_BUILTIN_PERMISSIONS.has(String(permission))) {
          hasAny = true;
          break;
        }

        const hasPerm = await rbacService.checkPermission(user.id, permission);
        if (hasPerm) {
          hasAny = true;
          break;
        }
      }

      if (!hasAny) {
        console.log(`User ${user.id} (${user.email}) missing any of permissions: ${requiredAny.join(', ')}`);
        throw new ForbiddenException(`Missing required permission`);
      }
    }

    return true;
  }
}
