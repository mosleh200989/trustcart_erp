/**
 * Tenant Configuration Registry
 *
 * Central registry of all tenants. Each tenant has its own database,
 * domain mappings, and branding.  Values are loaded from environment
 * variables so secrets never live in code.
 */

import { ConfigService } from '@nestjs/config';
import { TenantConfig } from './tenant.interface';

/**
 * Build the tenant registry from environment variables.
 * Called once at application startup.
 */
export function buildTenantRegistry(configService: ConfigService): TenantConfig[] {
  return [
    // ── TrustCart (Organic Grocery) ───────────────────────────
    {
      id: 'trustcart',
      name: 'TrustCart',
      domains: [
        'trustcart.com.bd',
        'www.trustcart.com.bd',
        'shop.trustcart.com.bd',
        'trustkert.com',
        'www.trustkert.com',
        'api.trustkert.com',
        'localhost:3000',   // local frontend dev
        'localhost:3001',   // local backend dev
      ],
      database: {
        host: configService.get<string>('DB_HOST', '127.0.0.1'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'trustcart_erp'),
      },
      branding: {
        siteName: 'TrustCart',
        siteUrl: 'https://trustkert.com',
        description: 'Premium organic groceries delivered to your door in Bangladesh.',
        supportEmail: 'support@trustcart.com.bd',
        supportPhone: '+8809613822083',
      },
      frontendUrl: configService.get<string>('FRONTEND_URL', 'https://www.trustcart.com.bd'),
      isActive: true,
    },

    // ── Natural Glowra (Cosmetics) ───────────────────────────
    {
      id: 'glowra',
      name: 'Natural Glowra',
      domains: [
        'naturalglowra.com',
        'www.naturalglowra.com',
        'api.naturalglowra.com',
        'localhost:3002',   // local frontend dev
      ],
      database: {
        host: configService.get<string>('GLOWRA_DB_HOST', configService.get<string>('DB_HOST', '127.0.0.1')),
        port: parseInt(configService.get<string>('GLOWRA_DB_PORT', configService.get<string>('DB_PORT', '5432')), 10),
        username: configService.get<string>('GLOWRA_DB_USER', configService.get<string>('DB_USER', 'postgres')),
        password: configService.get<string>('GLOWRA_DB_PASSWORD', configService.get<string>('DB_PASSWORD', '')),
        database: configService.get<string>('GLOWRA_DB_NAME', 'natural_glowra'),
      },
      branding: {
        siteName: 'Natural Glowra',
        siteUrl: 'https://naturalglowra.com',
        description: 'Premium natural cosmetics & skincare for radiant beauty.',
        supportEmail: 'support@naturalglowra.com',
        supportPhone: configService.get<string>('GLOWRA_SUPPORT_PHONE', ''),
      },
      frontendUrl: configService.get<string>('GLOWRA_FRONTEND_URL', 'https://www.naturalglowra.com'),
      isActive: true,
    },
  ];
}
