/**
 * Tenant Constants
 *
 * Injection tokens and keys used across the tenant module.
 */

/** Injection token – the full tenant registry array */
export const TENANT_REGISTRY = 'TENANT_REGISTRY';

/** Injection token – the resolved TenantConfig for the current request */
export const TENANT_CONTEXT = 'TENANT_CONTEXT';

/** Injection token – the TypeORM DataSource for the current tenant */
export const TENANT_DATA_SOURCE = 'TENANT_DATA_SOURCE';

/** Injection token – the TypeORM Connection for the current tenant (alias) */
export const TENANT_CONNECTION = 'TENANT_CONNECTION';

/** Default tenant ID used when no tenant can be resolved */
export const DEFAULT_TENANT_ID = 'trustcart';

/** HTTP header used to explicitly pass tenant ID */
export const TENANT_HEADER = 'x-tenant-id';
