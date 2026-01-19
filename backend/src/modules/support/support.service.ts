import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from './support-ticket.entity';
import { CustomersService } from '../customers/customers.service';
import { SUPPORT_TICKET_GROUPS, SUPPORT_TICKET_SEVERITIES } from './dto/support-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketsRepository: Repository<SupportTicket>,
    private customersService: CustomersService,
  ) {}

  async findAll() {
    return this.ticketsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomerId(customerId: string) {
    return this.ticketsRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomerEmail(email: string) {
    return this.ticketsRepository.find({
      where: { customerEmail: email },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    return this.ticketsRepository.findOne({ where: { id } });
  }

  async create(dto: any) {
    const normalizedPriority = dto?.priority ? String(dto.priority).toLowerCase() : dto?.priority;
    const normalizedStatus = this.normalizeStatus(dto?.status) ?? 'open';

    const routedGroup = this.routeSupportGroup({ subject: dto?.subject, message: dto?.message });
    const severity = this.normalizeSeverity(dto?.severity) ?? this.severityFromPriority(normalizedPriority);

    const { firstResponseDueAt, resolutionDueAt } = this.computeSlaDueDates({
      createdAt: new Date(),
      severity,
    });

    const normalized = {
      ...dto,
      status: normalizedStatus,
      priority: normalizedPriority,
      severity,
      supportGroup: this.normalizeSupportGroup(dto?.supportGroup) ?? routedGroup,
      firstResponseDueAt,
      resolutionDueAt,
      slaBreached: false,
    };
    const ticket = this.ticketsRepository.create(normalized);
    return await this.ticketsRepository.save(ticket);
  }

  async update(id: number, dto: any) {
    const normalized: any = {
      ...dto,
      status: dto?.status ? this.normalizeStatus(dto.status) : dto?.status,
      priority: dto?.priority ? String(dto.priority).toLowerCase() : dto?.priority,
      severity: dto?.severity ? this.normalizeSeverity(dto.severity) : dto?.severity,
      supportGroup: dto?.supportGroup ? this.normalizeSupportGroup(dto.supportGroup) : dto?.supportGroup,
    };
    await this.ticketsRepository.update(id, normalized);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.ticketsRepository.delete(id);
    return { id, message: 'Support ticket deleted' };
  }

  async addReply(id: number, response: string, status?: string) {
    const ticket = await this.findOne(id);
    const now = new Date();

    const updateData: any = {
      response,
      // Preserve first response timestamp if already set
      respondedAt: ticket?.respondedAt ?? now,
    };
    
    if (status) {
      updateData.status = this.normalizeStatus(status);
    }
    
    if (ticket?.firstResponseDueAt && !(ticket?.respondedAt) && now > ticket.firstResponseDueAt) {
      updateData.slaBreached = true;
    }

    await this.ticketsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    const nextStatus = this.normalizeStatus(status);
    const ticket = await this.findOne(id);
    const now = new Date();

    const patch: any = { status: nextStatus };

    if ((nextStatus === 'resolved' || nextStatus === 'closed') && !ticket?.resolvedAt) {
      patch.resolvedAt = now;
      if (ticket?.resolutionDueAt && now > ticket.resolutionDueAt) {
        patch.slaBreached = true;
      }
    }

    await this.ticketsRepository.update(id, patch);
    return this.findOne(id);
  }

  async updatePriority(id: number, priority: string) {
    const nextPriority = String(priority).toLowerCase();
    const ticket = await this.findOne(id);
    const nextSeverity = ticket?.severity ? ticket.severity : this.severityFromPriority(nextPriority);
    await this.ticketsRepository.update(id, { priority: nextPriority, severity: nextSeverity });
    return this.findOne(id);
  }

  async assignTicket(id: number, assignedTo: number | null) {
    await this.ticketsRepository.update(id, { assignedTo });
    return this.findOne(id);
  }

  async updateRouting(id: number, dto: { supportGroup?: string; severity?: string }) {
    const ticket = await this.findOne(id);
    if (!ticket) return null;

    const supportGroup = dto?.supportGroup ? this.normalizeSupportGroup(dto.supportGroup) : undefined;
    const severity = dto?.severity ? this.normalizeSeverity(dto.severity) : undefined;

    const patch: any = {};
    if (supportGroup) patch.supportGroup = supportGroup;
    if (severity) patch.severity = severity;

    if (severity) {
      const { firstResponseDueAt, resolutionDueAt } = this.computeSlaDueDates({
        createdAt: ticket.createdAt || new Date(),
        severity,
      });
      // Only override due dates if not already responded/resolved
      if (!ticket.respondedAt) patch.firstResponseDueAt = firstResponseDueAt;
      if (!ticket.resolvedAt) patch.resolutionDueAt = resolutionDueAt;
    }

    await this.ticketsRepository.update(id, patch);
    return this.findOne(id);
  }

  async getDashboardStats(rangeDays: number = 30) {
    const safeRangeDays = Number.isFinite(rangeDays) ? Math.max(1, Math.min(3650, rangeDays)) : 30;
    const since = new Date();
    since.setDate(since.getDate() - safeRangeDays);

    const base = this.ticketsRepository
      .createQueryBuilder('t')
      .where('t.createdAt >= :since', { since });

    const [total, totalOpen] = await Promise.all([
      base.clone().getCount(),
      base
        .clone()
        .andWhere('t.status IN (:...openStatuses)', { openStatuses: ['open', 'in_progress'] })
        .getCount(),
    ]);

    const [byStatusRaw, byPriorityRaw, byGroupRaw, bySeverityRaw, openByAssigneeRaw] = await Promise.all([
      base
        .clone()
        .select('t.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.status')
        .getRawMany<{ status: string; count: string }>(),
      base
        .clone()
        .select('t.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.priority')
        .getRawMany<{ priority: string; count: string }>(),
      base
        .clone()
        .select('t.supportGroup', 'supportGroup')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.supportGroup')
        .getRawMany<{ supportGroup: string; count: string }>(),
      base
        .clone()
        .select('t.severity', 'severity')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.severity')
        .getRawMany<{ severity: string; count: string }>(),
      base
        .clone()
        .andWhere('t.status IN (:...openStatuses)', { openStatuses: ['open', 'in_progress'] })
        .select('t.assignedTo', 'assignedTo')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.assignedTo')
        .getRawMany<{ assignedTo: string | null; count: string }>(),
    ]);

    const now = new Date();
    const [firstResponseOverdueRaw, resolutionOverdueRaw, breachedRaw] = await Promise.all([
      base
        .clone()
        .andWhere('t.respondedAt IS NULL')
        .andWhere('t.firstResponseDueAt IS NOT NULL')
        .andWhere('t.firstResponseDueAt < :now', { now })
        .andWhere('t.status IN (:...openStatuses)', { openStatuses: ['open', 'in_progress'] })
        .getCount(),
      base
        .clone()
        .andWhere('t.resolvedAt IS NULL')
        .andWhere('t.resolutionDueAt IS NOT NULL')
        .andWhere('t.resolutionDueAt < :now', { now })
        .andWhere('t.status IN (:...openStatuses)', { openStatuses: ['open', 'in_progress'] })
        .getCount(),
      base.clone().andWhere('t.slaBreached = true').getCount(),
    ]);

    return {
      rangeDays: safeRangeDays,
      since,
      total,
      totalOpen,
      byStatus: (byStatusRaw || []).map((r) => ({
        status: r.status,
        count: Number(r.count || 0),
      })),
      byPriority: (byPriorityRaw || []).map((r) => ({
        priority: r.priority,
        count: Number(r.count || 0),
      })),
      byGroup: (byGroupRaw || []).map((r) => ({
        supportGroup: r.supportGroup,
        count: Number(r.count || 0),
      })),
      bySeverity: (bySeverityRaw || []).map((r) => ({
        severity: r.severity,
        count: Number(r.count || 0),
      })),
      openByAssignee: (openByAssigneeRaw || []).map((r) => ({
        assignedTo: r.assignedTo != null ? Number(r.assignedTo) : null,
        count: Number(r.count || 0),
      })),
      sla: {
        firstResponseOverdue: Number(firstResponseOverdueRaw || 0),
        resolutionOverdue: Number(resolutionOverdueRaw || 0),
        breached: Number(breachedRaw || 0),
      },
    };
  }

  private normalizeStatus(status: unknown): string {
    const raw = String(status || '').trim().toLowerCase();
    if (raw === 'in-progress') return 'in_progress';
    return raw;
  }

  private normalizeSeverity(value: unknown): string | null {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return null;
    return (SUPPORT_TICKET_SEVERITIES as unknown as string[]).includes(raw) ? raw : null;
  }

  private normalizeSupportGroup(value: unknown): string | null {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return null;
    return (SUPPORT_TICKET_GROUPS as unknown as string[]).includes(raw) ? raw : null;
  }

  private severityFromPriority(priority: unknown): string {
    const p = String(priority || '').trim().toLowerCase();
    if (p === 'urgent') return 'critical';
    if (p === 'high') return 'high';
    if (p === 'medium') return 'medium';
    return 'low';
  }

  private routeSupportGroup(input: { subject?: unknown; message?: unknown }): string {
    const haystack = `${input?.subject ?? ''} ${input?.message ?? ''}`.toLowerCase();
    const has = (re: RegExp) => re.test(haystack);

    if (has(/refund|payment|invoice|billing|wallet|charge/)) return 'billing';
    if (has(/delivery|courier|late|missing|damaged|tracking/)) return 'delivery';
    if (has(/login|account|password|otp|verify|verification/)) return 'account';
    if (has(/bug|error|crash|not working|technical|issue/)) return 'technical';
    return 'general';
  }

  private computeSlaDueDates(params: { createdAt: Date; severity: string }) {
    const createdAt = params.createdAt instanceof Date ? params.createdAt : new Date();
    const sev = String(params.severity || 'medium').toLowerCase();

    const minutes = (m: number) => m * 60 * 1000;
    const hours = (h: number) => minutes(h * 60);
    const days = (d: number) => hours(d * 24);

    const firstResponseMs =
      sev === 'critical' ? hours(1) : sev === 'high' ? hours(4) : sev === 'medium' ? hours(12) : hours(24);
    const resolutionMs =
      sev === 'critical' ? hours(8) : sev === 'high' ? days(1) : sev === 'medium' ? days(3) : days(7);

    return {
      firstResponseDueAt: new Date(createdAt.getTime() + firstResponseMs),
      resolutionDueAt: new Date(createdAt.getTime() + resolutionMs),
    };
  }
}
