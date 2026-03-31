/**
 * TenantController
 *
 * Exposes read-only endpoints that let the frontend discover which tenant
 * it is connected to and fetch tenant-specific branding / config.
 */

import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantService } from './tenant.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Tenant')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Get('current')
  @ApiOperation({ summary: 'Get current tenant info resolved from the request' })
  @ApiHeader({ name: 'x-tenant-id', required: false, description: 'Explicit tenant ID' })
  getCurrentTenant(@Req() req: Request) {
    const tenant = req.tenant;
    if (!tenant) {
      return { error: 'Tenant not resolved' };
    }
    return {
      id: tenant.id,
      name: tenant.name,
      branding: tenant.branding,
      frontendUrl: tenant.frontendUrl,
    };
  }

  @Public()
  @Get('list')
  @ApiOperation({ summary: 'List all active tenants (public metadata only)' })
  listTenants() {
    return this.tenantService
      .getAllTenants()
      .filter((t) => t.isActive)
      .map((t) => ({
        id: t.id,
        name: t.name,
        branding: {
          siteName: t.branding.siteName,
          siteUrl: t.branding.siteUrl,
          description: t.branding.description,
        },
      }));
  }
}
