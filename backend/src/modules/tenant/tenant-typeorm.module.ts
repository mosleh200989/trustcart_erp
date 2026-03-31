/**
 * TenantTypeOrmModule
 *
 * Drop-in replacement for TypeOrmModule.forFeature().
 *
 * Instead of binding repositories to the single default DataSource,
 * it provides **proxy repositories** that dynamically resolve the
 * correct tenant DataSource on every property access / method call
 * using AsyncLocalStorage.
 *
 * Usage — in any feature module:
 *   imports: [TenantTypeOrmModule.forFeature([User, Customer])]
 *
 * Services keep using the same injection token:
 *   @InjectRepository(User) private usersRepo: Repository<User>
 *
 * How it works:
 *  1. Each entity gets a singleton Proxy object registered under
 *     the standard `getRepositoryToken(entity)` token.
 *  2. On every property access the Proxy reads TenantContext to
 *     find the current tenant, gets the cached DataSource from
 *     TenantService, and delegates to the real Repository<T>.
 *  3. DataSources are pre-initialized at app startup so the
 *     proxy resolution is fully synchronous (no await).
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { TenantService } from './tenant.service';
import { TenantContext } from './tenant.context';

function createTenantAwareRepositoryProxy<T extends ObjectLiteral>(
  entity: Function,
  tenantService: TenantService,
): Repository<T> {
  // The proxy intercepts every property access and routes it to the
  // correct tenant-specific repository instance.
  return new Proxy({} as Repository<T>, {
    get(_target, prop, _receiver) {
      // During NestJS DI, the injector may inspect the proxy (e.g. checking
      // for 'then' to see if it's a Promise). Return safe defaults when
      // DataSources aren't initialized yet.
      if (prop === 'then') return undefined;

      const tenantId = TenantContext.getCurrentTenantId();
      const ds = tenantService.getCachedDataSource(tenantId);
      if (!ds) {
        // DataSource not ready (startup / DI phase).  Return undefined so
        // NestJS introspection completes without throwing.
        return undefined;
      }
      const repo = ds.getRepository(entity);
      const value = (repo as any)[prop];
      if (typeof value === 'function') {
        return value.bind(repo);
      }
      return value;
    },
  });
}

@Module({})
export class TenantTypeOrmModule {
  /**
   * Provide tenant-aware repositories for the given entities.
   * Replaces `TypeOrmModule.forFeature([Entity1, Entity2, ...])`.
   */
  static forFeature(entities: Function[]): DynamicModule {
    const providers: Provider[] = entities.map((entity) => ({
      provide: getRepositoryToken(entity),
      useFactory: (tenantService: TenantService) =>
        createTenantAwareRepositoryProxy(entity, tenantService),
      inject: [TenantService],
    }));

    return {
      module: TenantTypeOrmModule,
      providers,
      exports: providers.map((p) => (p as any).provide),
    };
  }
}
