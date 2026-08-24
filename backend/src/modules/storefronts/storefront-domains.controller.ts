import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { StorefrontDomainsService } from './storefront-domains.service';
import { StorefrontDomain } from './storefront-domain.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('storefront-domains')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorefrontDomainsController {
  constructor(private readonly domainsService: StorefrontDomainsService) {}

  /** Consumed by the Next.js middleware (cached 60s on its side). */
  @Get('public/map')
  @Public()
  publicMap() {
    return this.domainsService.publicMap();
  }

  @Get()
  @RequirePermissions('view-storefronts')
  findAll() {
    return this.domainsService.findAll();
  }

  @Post()
  @RequirePermissions('manage-storefronts')
  create(@Body() data: Partial<StorefrontDomain>) {
    return this.domainsService.create(data);
  }

  @Put(':id')
  @RequirePermissions('manage-storefronts')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<StorefrontDomain>) {
    return this.domainsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('manage-storefronts')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.domainsService.remove(id);
  }

  @Get(':id/dns-check')
  @RequirePermissions('view-storefronts')
  dnsCheck(@Param('id', ParseIntPipe) id: number) {
    return this.domainsService.dnsCheck(id);
  }
}
