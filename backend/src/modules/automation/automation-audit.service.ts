import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationAudit } from './entities/automation-audit.entity';

export type AutomationAuditActor = {
  id?: number | null;
  email?: string | null;
  ip?: string | null;
};

/** Keys whose values must never reach the audit trail. */
const SECRET_KEYS = new Set([
  'page_access_token',
  'password',
  'new_password',
  'current_password',
  'password_hash',
  'token',
]);

/**
 * Records every change made inside the Automation panel.
 *
 * Writes are best-effort: an audit failure must never block the action the user
 * was performing, so failures are logged and swallowed.
 */
@Injectable()
export class AutomationAuditService {
  private readonly logger = new Logger(AutomationAuditService.name);

  constructor(
    @InjectRepository(AutomationAudit)
    private readonly auditRepository: Repository<AutomationAudit>,
  ) {}

  /** Replaces secret values with a marker so tokens never land in the log. */
  private redact(value: any): any {
    if (value == null || typeof value !== 'object') return value ?? null;
    if (Array.isArray(value)) return value.map((item) => this.redact(item));

    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SECRET_KEYS.has(key)) {
        out[key] = val ? '[redacted]' : null;
      } else if (val && typeof val === 'object') {
        out[key] = this.redact(val);
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  async record(
    actor: AutomationAuditActor | null,
    action: string,
    entity?: string | null,
    entityId?: string | number | null,
    before?: any,
    after?: any,
  ): Promise<void> {
    try {
      await this.auditRepository.save(
        this.auditRepository.create({
          user_id: actor?.id ?? null,
          user_email: actor?.email ?? null,
          action,
          entity: entity ?? null,
          entity_id: entityId == null ? null : String(entityId),
          before: before === undefined ? null : this.redact(before),
          after: after === undefined ? null : this.redact(after),
          ip: actor?.ip ?? null,
        }),
      );
    } catch (error: any) {
      this.logger.warn(`Failed to write automation audit entry "${action}": ${error?.message}`);
    }
  }

  async list(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    entity?: string;
  }): Promise<{ rows: AutomationAudit[]; total: number }> {
    const limit = Math.min(Math.max(Number(options?.limit) || 50, 1), 200);
    const offset = Math.max(Number(options?.offset) || 0, 0);

    const query = this.auditRepository
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (options?.action) query.andWhere('a.action = :action', { action: options.action });
    if (options?.entity) query.andWhere('a.entity = :entity', { entity: options.entity });

    const [rows, total] = await query.getManyAndCount();
    return { rows, total };
  }
}
