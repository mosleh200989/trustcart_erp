/**
 * TenantModule
 *
 * Global module that provides multi-tenant infrastructure:
 *  - TenantService      → tenant lookup, DataSource cache
 *  - TenantMiddleware   → resolves tenant per request
 *  - TENANT_CONNECTION  → request-scoped DataSource (for direct injection)
 *
 * How it works:
 *  1. Middleware resolves the tenant from request headers/domain.
 *  2. TenantService lazily creates and caches a DataSource per tenant.
 *  3. The default TypeORM connection remains for the primary tenant,
 *     while TENANT_CONNECTION gives explicit access to the current tenant's
 *     DataSource when needed.
 */

import {
  Module,
  Global,
  MiddlewareConsumer,
  NestModule,
  OnModuleInit,
  Scope,
  Logger,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { TenantService } from './tenant.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantController } from './tenant.controller';
import { TENANT_REGISTRY, TENANT_CONNECTION } from './tenant.constants';
import { buildTenantRegistry } from './tenant.config';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DataSource } from 'typeorm';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [TenantController],
  providers: [
    // Provide the tenant registry built from env vars
    {
      provide: TENANT_REGISTRY,
      useFactory: (configService: ConfigService) => buildTenantRegistry(configService),
      inject: [ConfigService],
    },

    TenantService,

    // Request-scoped provider that gives the current tenant's DataSource
    {
      provide: TENANT_CONNECTION,
      scope: Scope.REQUEST,
      useFactory: async (request: Request, tenantService: TenantService): Promise<DataSource> => {
        const tenantId = request.tenantId;
        if (!tenantId) {
          throw new Error('Tenant not resolved — TenantMiddleware may not be applied.');
        }
        // Entity list is loaded from the default DataSource metadata
        // so all tenants share the same entity schema
        const defaultDs = tenantService['dataSources'].values().next().value as DataSource | undefined;
        const entities = defaultDs?.options?.entities as Function[] ?? [];
        return tenantService.getDataSource(tenantId, entities);
      },
      inject: [REQUEST, TenantService],
    },
  ],
  exports: [TenantService, TENANT_REGISTRY, TENANT_CONNECTION],
})
export class TenantModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(TenantModule.name);

  constructor(
    private readonly tenantService: TenantService,
    @InjectDataSource() private readonly defaultDataSource: DataSource,
  ) {}

  /**
   * Pre-initialize all tenant DataSources after DI is complete.
   * The default TypeORM DataSource (trustcart) is reused directly;
   * additional tenants (glowra) get their own DataSources.
   */
  async onModuleInit(): Promise<void> {
    // Reuse the default DataSource for the primary tenant — avoids a duplicate connection.
    this.tenantService.registerDataSource('trustcart', this.defaultDataSource);

    const entities = (this.defaultDataSource.options.entities || []) as Function[];
    this.logger.log(`Initializing tenant DataSources with ${entities.length} entities...`);
    // Only creates DataSources for tenants not yet registered (i.e. glowra).
    // synchronize=false — use pg_dump/pg_restore or migrations for schema setup.
    await this.tenantService.initializeAll(entities, false);
    this.logger.log('All tenant DataSources initialized.');
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
