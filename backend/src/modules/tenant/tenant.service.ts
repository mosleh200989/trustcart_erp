/**
 * TenantService
 *
 * Provides methods to look up tenants and manage per-tenant DataSources.
 * DataSources are lazily initialized and cached for the lifetime of the process.
 */

import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TenantConfig, TenantDatabaseConfig } from './tenant.interface';
import { TENANT_REGISTRY } from './tenant.constants';

@Injectable()
export class TenantService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantService.name);

  /** domain → tenant ID quick lookup */
  private readonly domainMap = new Map<string, string>();

  /** tenant ID → cached DataSource */
  private readonly dataSources = new Map<string, DataSource>();

  constructor(
    @Inject(TENANT_REGISTRY)
    private readonly registry: TenantConfig[],
  ) {
    // Build domain → tenantId map for O(1) lookups
    for (const tenant of this.registry) {
      for (const domain of tenant.domains) {
        this.domainMap.set(domain.toLowerCase(), tenant.id);
      }
    }
    this.logger.log(
      `Tenant registry loaded: ${this.registry.map((t) => t.id).join(', ')}`,
    );
  }

  /** Shut down all cached connections on module destroy */
  async onModuleDestroy(): Promise<void> {
    for (const [id, ds] of this.dataSources) {
      if (ds.isInitialized) {
        this.logger.log(`Closing DataSource for tenant "${id}"`);
        await ds.destroy();
      }
    }
    this.dataSources.clear();
  }

  /** Get full tenant list */
  getAllTenants(): TenantConfig[] {
    return this.registry;
  }

  /** Lookup tenant by id */
  getTenantById(id: string): TenantConfig | undefined {
    return this.registry.find((t) => t.id === id);
  }

  /** Lookup tenant by a domain string (host:port) */
  getTenantByDomain(domain: string): TenantConfig | undefined {
    const tenantId = this.domainMap.get(domain.toLowerCase());
    return tenantId ? this.getTenantById(tenantId) : undefined;
  }

  /**
   * Get a cached DataSource synchronously. Returns undefined if not yet initialized.
   * Used by proxy repositories — DataSources must be pre-initialized via initializeAll().
   */
  getCachedDataSource(tenantId: string): DataSource | undefined {
    const ds = this.dataSources.get(tenantId);
    return ds?.isInitialized ? ds : undefined;
  }

  /**
   * Register an externally-managed DataSource (e.g. the default TypeORM connection)
   * under a tenant ID. Skips creation of a duplicate connection for that tenant.
   */
  registerDataSource(tenantId: string, ds: DataSource): void {
    if (ds.isInitialized) {
      this.dataSources.set(tenantId, ds);
      this.logger.log(`Registered existing DataSource for tenant "${tenantId}" → DB "${(ds.options as any).database}"`);
    }
  }

  /**
   * Pre-initialize DataSources for all active tenants at application startup.
   * Tenants that already have a registered DataSource (via registerDataSource)
   * are skipped.
   *
   * @param syncSchema - If true, runs TypeORM synchronize to create/update
   *                     tables in each tenant DB (useful for new databases).
   */
  async initializeAll(entities: Function[], syncSchema = false): Promise<void> {
    for (const tenant of this.registry) {
      if (!tenant.isActive) continue;
      if (this.dataSources.has(tenant.id)) continue; // already registered
      try {
        await this.getDataSource(tenant.id, entities, syncSchema);
      } catch (err) {
        this.logger.error(
          `Failed to initialize DataSource for tenant "${tenant.id}": ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Get or create a TypeORM DataSource for the given tenant.
   * DataSources are lazily created and cached.
   *
   * @param entities - The entity classes to register (from AppModule).
   */
  async getDataSource(tenantId: string, entities: Function[], syncSchema = false): Promise<DataSource> {
    const existing = this.dataSources.get(tenantId);
    if (existing?.isInitialized) return existing;

    const tenant = this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error(`No tenant found for id "${tenantId}"`);
    }

    const ds = new DataSource(this.buildDataSourceOptions(tenant.database, entities, syncSchema));
    await ds.initialize();
    this.dataSources.set(tenantId, ds);
    this.logger.log(`DataSource initialized for tenant "${tenantId}" → DB "${tenant.database.database}"`);
    return ds;
  }

  private buildDataSourceOptions(
    db: TenantDatabaseConfig,
    entities: Function[],
    synchronize = false,
  ): DataSourceOptions {
    return {
      type: 'postgres',
      host: db.host,
      port: db.port,
      username: db.username,
      password: db.password,
      database: db.database,
      entities,
      synchronize,
      logging: process.env.NODE_ENV === 'development',
      extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    };
  }
}
