import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from './audit-log.service';

/** Map URL path segments to human-readable module names */
const MODULE_MAP: Record<string, string> = {
  products: 'Products',
  customers: 'Customers',
  'order-management': 'Sales',
  sales: 'Sales',
  crm: 'CRM',
  users: 'Users',
  rbac: 'Roles & Permissions',
  roles: 'Roles & Permissions',
  hrm: 'HR Management',
  payroll: 'Payroll',
  accounting: 'Accounting',
  inventory: 'Inventory',
  purchase: 'Purchase',
  offers: 'Offers',
  'special-offers': 'Special Offers',
  banners: 'Banners',
  categories: 'Categories',
  combos: 'Combo Products',
  blog: 'Blog',
  telephony: 'Telephony',
  support: 'Support',
  loyalty: 'Loyalty',
  settings: 'Settings',
  'landing-pages': 'Landing Pages',
  recruitment: 'Recruitment',
  tagging: 'Tagging',
  upload: 'Upload',
  cart: 'Cart',
  reviews: 'Reviews',
  subscribers: 'Subscribers',
  'lead-management': 'Lead Management',
  payment: 'Payment',
  projects: 'Projects',
};

const ACTION_MAP: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

/** Paths to skip completely (health checks, reads, auth token refreshes, etc.) */
const SKIP_PATTERNS = [
  /^\/api\/auth\/login$/,
  /^\/api\/auth\/refresh$/,
  /^\/api\/audit-logs/,
  /^\/api\/telephony\/agents\/me\/status$/,
];

/** Sensitive fields to never log values for */
const REDACTED_FIELDS = new Set([
  'password', 'password_hash', 'token', 'refresh_token', 'secret',
  'access_token', 'api_key', 'apiKey',
]);

function redactSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const redacted: any = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(redacted)) {
    if (REDACTED_FIELDS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

function deriveModule(path: string): string {
  // path like /api/products/123 or /api/crm/automation/engagement
  const segments = path.replace(/^\/api\//, '').split('/');
  for (const seg of segments) {
    if (MODULE_MAP[seg]) return MODULE_MAP[seg];
  }
  return segments[0] || 'Unknown';
}

function deriveEntityType(path: string, method: string): string {
  const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean);
  // Walk segments and pick the most meaningful noun (skip IDs which are numeric)
  const nouns: string[] = [];
  for (const seg of segments) {
    if (/^\d+$/.test(seg)) continue; // skip numeric IDs
    if (seg === 'api') continue;
    nouns.push(seg);
  }
  // Take the last 1-2 meaningful segments and title-case them
  const meaningful = nouns.slice(0, 3).join(' ');
  return meaningful
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function deriveEntityId(path: string, body: any, responseData: any): string | null {
  // Try to extract entity ID from URL path (e.g. /api/products/123)
  const segments = path.replace(/^\/api\//, '').split('/');
  for (let i = segments.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(segments[i])) return segments[i];
  }
  // From response (newly created entity)
  if (responseData?.id) return String(responseData.id);
  // From body
  if (body?.id) return String(body.id);
  return null;
}

function buildDescription(method: string, path: string, body: any, entityType: string): string {
  const action = ACTION_MAP[method] || method;
  const entityId = deriveEntityId(path, body, null);
  const idStr = entityId ? ` #${entityId}` : '';

  if (action === 'CREATE') return `Created ${entityType}${idStr}`;
  if (action === 'DELETE') return `Deleted ${entityType}${idStr}`;
  if (action === 'UPDATE') {
    const fields = body ? Object.keys(body).filter((k) => !REDACTED_FIELDS.has(k.toLowerCase())) : [];
    if (fields.length > 0 && fields.length <= 8) {
      return `Updated ${entityType}${idStr} — fields: ${fields.join(', ')}`;
    }
    return `Updated ${entityType}${idStr}`;
  }
  return `${action} on ${entityType}${idStr}`;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method?.toUpperCase();

    // Only audit mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const path: string = req.originalUrl || req.url || '';

    // Skip patterns
    if (SKIP_PATTERNS.some((p) => p.test(path))) {
      return next.handle();
    }

    const user = req.user;
    const body = req.body;

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          // Fire-and-forget — do not slow down the response
          this.logAction(method, path, user, body, responseData, req).catch(() => {});
        },
        error: () => {
          // We don't log failed requests to avoid noise
        },
      }),
    );
  }

  private async logAction(
    method: string,
    path: string,
    user: any,
    body: any,
    responseData: any,
    req: any,
  ) {
    try {
      const module = deriveModule(path);
      const action = ACTION_MAP[method] || method;
      const entityType = deriveEntityType(path, method);
      const entityId = deriveEntityId(path, body, responseData);
      const description = buildDescription(method, path, body, entityType);

      const changedFields = body && action === 'UPDATE'
        ? Object.keys(body).filter((k) => !REDACTED_FIELDS.has(k.toLowerCase()))
        : null;

      const ip = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || req.ip || '';
      const userAgent = req.headers?.['user-agent'] || '';

      await this.auditLogService.create({
        module,
        action,
        entity_type: entityType,
        entity_id: entityId || undefined,
        description,
        changed_fields: changedFields && changedFields.length > 0 ? changedFields : null,
        old_values: null, // Old values would require pre-fetching — kept null for interceptor-level logging
        new_values: body ? redactSensitive(body) : null,
        performed_by: user?.id || user?.userId || null,
        performed_by_name: user?.name || user?.email || null,
        endpoint: path,
        http_method: method,
        ip_address: typeof ip === 'string' ? ip.split(',')[0].trim() : '',
        user_agent: userAgent,
      });
    } catch (err) {
      // Silent fail — audit logging must never break the app
      console.error('[AuditInterceptor] Failed to save audit log:', (err as any)?.message || err);
    }
  }
}
