/**
 * TenantContext
 *
 * Uses Node.js AsyncLocalStorage to propagate the current tenant ID
 * through the full async call chain of a request, without polluting
 * service constructors or method signatures.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { DEFAULT_TENANT_ID } from './tenant.constants';

interface TenantStore {
  tenantId: string;
}

const als = new AsyncLocalStorage<TenantStore>();

export const TenantContext = {
  /** Run a callback within a tenant scope */
  run<T>(tenantId: string, fn: () => T): T {
    return als.run({ tenantId }, fn);
  },

  /** Get the current tenant ID (falls back to default) */
  getCurrentTenantId(): string {
    return als.getStore()?.tenantId ?? DEFAULT_TENANT_ID;
  },
};
