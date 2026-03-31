/**
 * @Tenant() Parameter Decorator
 *
 * Extracts the resolved TenantConfig from the current request.
 * Usage in controllers:
 *
 *   @Get()
 *   findAll(@Tenant() tenant: TenantConfig) { ... }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantConfig } from './tenant.interface';

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantConfig => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);
