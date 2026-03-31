/**
 * Multi-Tenant Configuration Interfaces
 * Defines tenant metadata, database config, and branding per tenant.
 */

export interface TenantDatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface TenantBranding {
  siteName: string;
  siteUrl: string;
  description: string;
  supportEmail: string;
  supportPhone: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface TenantConfig {
  id: string;
  name: string;
  domains: string[];           // Domains mapped to this tenant
  database: TenantDatabaseConfig;
  branding: TenantBranding;
  frontendUrl: string;
  isActive: boolean;
}
