/**
 * Tenant Middleware
 *
 * Resolves the current tenant from the incoming request by checking:
 *   1. The `X-Tenant-ID` header (explicit, e.g. from the frontend)
 *   2. The `Origin` / `Referer` header (domain-based resolution)
 *   3. The `Host` header (direct API request)
 *
 * Attaches the resolved TenantConfig to `req.tenant` so downstream
 * services can access it via the TenantService.
 */

import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantConfig } from './tenant.interface';
import { DEFAULT_TENANT_ID, TENANT_HEADER } from './tenant.constants';
import { TenantService } from './tenant.service';
import { TenantContext } from './tenant.context';

// Extend Express Request to carry tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantConfig;
      tenantId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = this.resolveFromHeader(req)
      || this.resolveFromOrigin(req)
      || this.resolveFromHost(req)
      || DEFAULT_TENANT_ID;

    const tenant = this.tenantService.getTenantById(tenantId);

    if (!tenant || !tenant.isActive) {
      throw new HttpException(
        `Tenant "${tenantId}" is not available.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;

    // Propagate tenant through AsyncLocalStorage so proxy repositories
    // can resolve the correct DataSource without request injection.
    TenantContext.run(tenant.id, () => next());
  }

  /** Check explicit X-Tenant-ID header */
  private resolveFromHeader(req: Request): string | null {
    const header = req.headers[TENANT_HEADER] as string | undefined;
    if (header && this.tenantService.getTenantById(header)) {
      return header;
    }
    return null;
  }

  /** Check Origin or Referer to match domain → tenant */
  private resolveFromOrigin(req: Request): string | null {
    const origin = (req.headers.origin || req.headers.referer) as string | undefined;
    if (!origin) return null;
    try {
      const hostname = new URL(origin).host; // includes port
      return this.tenantService.getTenantByDomain(hostname)?.id ?? null;
    } catch {
      return null;
    }
  }

  /** Check Host header */
  private resolveFromHost(req: Request): string | null {
    const host = req.headers.host;
    if (!host) return null;
    return this.tenantService.getTenantByDomain(host)?.id ?? null;
  }
}
