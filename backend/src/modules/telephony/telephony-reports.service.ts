import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { TelephonyCall, TelephonyCallStatus } from './entities/telephony-call.entity';
import { TelephonyAgentPresenceEvent } from './entities/telephony-agent-presence-event.entity';

function parseDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function clampInt(value: any, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

@Injectable()
export class TelephonyReportsService {
  constructor(
    @InjectRepository(TelephonyCall)
    private readonly telephonyCallRepo: Repository<TelephonyCall>,
    @InjectRepository(TelephonyAgentPresenceEvent)
    private readonly presenceEventRepo: Repository<TelephonyAgentPresenceEvent>,
  ) {}

  private getRange(params?: { from?: string; to?: string; rangeDays?: number }) {
    const to = parseDate(params?.to) ?? new Date();
    const rangeDays = clampInt(params?.rangeDays, 1, 3650, 7);
    const from = parseDate(params?.from) ?? new Date(to.getTime() - rangeDays * 24 * 3600 * 1000);
    return { from, to, rangeDays };
  }

  async getCdr(params?: {
    from?: string;
    to?: string;
    rangeDays?: number;
    agentUserId?: number;
    direction?: string;
    status?: string;
    queueName?: string;
    trunkName?: string;
    disposition?: string;
    page?: number;
    limit?: number;
  }) {
    const { from, to, rangeDays } = this.getRange({ from: params?.from, to: params?.to, rangeDays: params?.rangeDays });
    const safeLimit = clampInt(params?.limit, 1, 200, 50);
    const safePage = clampInt(params?.page, 1, 1000000, 1);
    const skip = (safePage - 1) * safeLimit;

    const qb = this.telephonyCallRepo
      .createQueryBuilder('c')
      .where('c.startedAt >= :from AND c.startedAt <= :to', { from, to });

    if (params?.agentUserId != null && Number.isFinite(params.agentUserId)) {
      qb.andWhere('c.agentUserId = :agentUserId', { agentUserId: Number(params.agentUserId) });
    }
    if (params?.direction) qb.andWhere('c.direction = :direction', { direction: String(params.direction) });
    if (params?.status) qb.andWhere('c.status = :status', { status: String(params.status) });
    if (params?.queueName) qb.andWhere('c.queueName = :queueName', { queueName: String(params.queueName) });
    if (params?.trunkName) qb.andWhere('c.trunkName = :trunkName', { trunkName: String(params.trunkName) });
    if (params?.disposition) qb.andWhere('c.disposition = :disposition', { disposition: String(params.disposition) });

    qb.orderBy('c.startedAt', 'DESC');

    const [items, total] = await qb.skip(skip).take(safeLimit).getManyAndCount();

    const summary = await this.telephonyCallRepo
      .createQueryBuilder('c')
      .where('c.startedAt >= :from AND c.startedAt <= :to', { from, to })
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .getRawMany<{ status: string; count: string }>();

    return {
      rangeDays,
      from,
      to,
      page: safePage,
      limit: safeLimit,
      total,
      byStatus: (summary || []).map((r) => ({ status: r.status, count: Number(r.count || 0) })),
      items,
    };
  }

  async getQueueReport(params?: { from?: string; to?: string; rangeDays?: number }) {
    const { from, to, rangeDays } = this.getRange(params);

    const rows = await this.telephonyCallRepo
      .createQueryBuilder('c')
      .where('c.startedAt >= :from AND c.startedAt <= :to', { from, to })
      .select("COALESCE(c.queueName, 'unknown')", 'queueName')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN c.status = '${TelephonyCallStatus.COMPLETED}' THEN 1 ELSE 0 END)`, 'completed')
      .addSelect(`SUM(CASE WHEN c.status = '${TelephonyCallStatus.FAILED}' THEN 1 ELSE 0 END)`, 'failed')
      .addSelect('COALESCE(AVG(c.waitSeconds), 0)', 'avgWaitSeconds')
      .addSelect('COALESCE(AVG(c.holdSeconds), 0)', 'avgHoldSeconds')
      .addSelect('COALESCE(AVG(c.durationSeconds), 0)', 'avgDurationSeconds')
      .groupBy('queueName')
      .orderBy('total', 'DESC')
      .getRawMany<any>();

    return {
      rangeDays,
      from,
      to,
      items: (rows || []).map((r: any) => ({
        queueName: r.queuename,
        total: Number(r.total || 0),
        completed: Number(r.completed || 0),
        failed: Number(r.failed || 0),
        avgWaitSeconds: Number(r.avgwaitseconds || 0),
        avgHoldSeconds: Number(r.avgholdseconds || 0),
        avgDurationSeconds: Number(r.avgdurationseconds || 0),
      })),
    };
  }

  async getTrunkReport(params?: { from?: string; to?: string; rangeDays?: number }) {
    const { from, to, rangeDays } = this.getRange(params);
    const periodSeconds = Math.max(1, Math.floor((to.getTime() - from.getTime()) / 1000));

    const rows = await this.telephonyCallRepo
      .createQueryBuilder('c')
      .where('c.startedAt >= :from AND c.startedAt <= :to', { from, to })
      .select("COALESCE(c.trunkName, 'unknown')", 'trunkName')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COALESCE(SUM(c.durationSeconds), 0)', 'totalDurationSeconds')
      .addSelect('COALESCE(AVG(c.durationSeconds), 0)', 'avgDurationSeconds')
      .groupBy('trunkName')
      .orderBy('totalDurationSeconds', 'DESC')
      .getRawMany<any>();

    return {
      rangeDays,
      from,
      to,
      periodSeconds,
      items: (rows || []).map((r: any) => {
        const totalDurationSeconds = Number(r.totaldurationseconds || 0);
        return {
          trunkName: r.trunkname,
          total: Number(r.total || 0),
          totalDurationSeconds,
          avgDurationSeconds: Number(r.avgdurationseconds || 0),
          utilizationRatioAssumingSingleChannel: totalDurationSeconds / periodSeconds,
        };
      }),
    };
  }

  async getAgentCallReport(params?: { from?: string; to?: string; rangeDays?: number }) {
    const { from, to, rangeDays } = this.getRange(params);

    const rows = await this.telephonyCallRepo
      .createQueryBuilder('c')
      .where('c.startedAt >= :from AND c.startedAt <= :to', { from, to })
      .andWhere('c.agentUserId IS NOT NULL')
      .select('c.agentUserId', 'agentUserId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN c.status = '${TelephonyCallStatus.COMPLETED}' THEN 1 ELSE 0 END)`, 'completed')
      .addSelect(`SUM(CASE WHEN c.status = '${TelephonyCallStatus.FAILED}' THEN 1 ELSE 0 END)`, 'failed')
      .addSelect('COALESCE(SUM(c.durationSeconds), 0)', 'totalDurationSeconds')
      .addSelect('COALESCE(AVG(c.durationSeconds), 0)', 'avgDurationSeconds')
      .groupBy('c.agentUserId')
      .orderBy('total', 'DESC')
      .getRawMany<any>();

    return {
      rangeDays,
      from,
      to,
      items: (rows || []).map((r: any) => ({
        agentUserId: Number(r.agentuserid),
        total: Number(r.total || 0),
        completed: Number(r.completed || 0),
        failed: Number(r.failed || 0),
        totalDurationSeconds: Number(r.totaldurationseconds || 0),
        avgDurationSeconds: Number(r.avgdurationseconds || 0),
      })),
    };
  }

  async getWaitHoldReport(params?: { from?: string; to?: string; rangeDays?: number }) {
    const { from, to, rangeDays } = this.getRange(params);

    const byDirection = await this.telephonyCallRepo
      .createQueryBuilder('c')
      .where('c.startedAt >= :from AND c.startedAt <= :to', { from, to })
      .select('c.direction', 'direction')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COALESCE(AVG(c.waitSeconds), 0)', 'avgWaitSeconds')
      .addSelect('COALESCE(AVG(c.holdSeconds), 0)', 'avgHoldSeconds')
      .groupBy('c.direction')
      .getRawMany<any>();

    return {
      rangeDays,
      from,
      to,
      byDirection: (byDirection || []).map((r: any) => ({
        direction: r.direction,
        total: Number(r.total || 0),
        avgWaitSeconds: Number(r.avgwaitseconds || 0),
        avgHoldSeconds: Number(r.avgholdseconds || 0),
      })),
    };
  }

  async getAgentPresenceReport(params?: { from?: string; to?: string; rangeDays?: number; userId?: number }) {
    const { from, to, rangeDays } = this.getRange(params);

    const where: any = { occurredAt: Between(from, to) };
    if (params?.userId != null) where.userId = Number(params.userId);

    const eventsInRange = await this.presenceEventRepo.find({ where, order: { userId: 'ASC', occurredAt: 'ASC' } as any });

    // Baseline: last event before range start per user (Postgres DISTINCT ON)
    const baselineEvents = (await this.presenceEventRepo.query(
      `SELECT DISTINCT ON (user_id)
        id, user_id as "userId", status, source, occurred_at as "occurredAt", created_at as "createdAt"
      FROM telephony_agent_presence_events
      WHERE occurred_at < $1
      ${params?.userId != null ? 'AND user_id = $2' : ''}
      ORDER BY user_id, occurred_at DESC`,
      params?.userId != null ? [from, Number(params.userId)] : [from],
    )) as TelephonyAgentPresenceEvent[];

    const byUser = new Map<number, TelephonyAgentPresenceEvent[]>();
    for (const ev of [...(baselineEvents || []), ...(eventsInRange || [])]) {
      const list = byUser.get(ev.userId) || [];
      list.push(ev);
      byUser.set(ev.userId, list);
    }

    const results: any[] = [];
    for (const [userId, events] of byUser.entries()) {
      const ordered = (events || []).slice().sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

      let currentStatus: any = 'offline';
      let cursor = from;

      // If we have baseline events before `from`, pick the last one
      const baseline = ordered.filter((e) => e.occurredAt.getTime() < from.getTime());
      if (baseline.length > 0) {
        currentStatus = baseline[baseline.length - 1].status;
      }

      // Only process events inside range
      const inRange = ordered.filter((e) => e.occurredAt.getTime() >= from.getTime() && e.occurredAt.getTime() <= to.getTime());

      const totals: Record<string, number> = { online: 0, on_call: 0, break: 0, offline: 0 };
      let loginCount = 0;
      let logoutCount = 0;
      let breakCount = 0;

      const applyDuration = (fromT: Date, toT: Date, status: string) => {
        const seconds = Math.max(0, Math.floor((toT.getTime() - fromT.getTime()) / 1000));
        totals[status] = (totals[status] || 0) + seconds;
      };

      for (const ev of inRange) {
        applyDuration(cursor, ev.occurredAt, currentStatus);

        const prev = currentStatus;
        currentStatus = ev.status;
        cursor = ev.occurredAt;

        if (prev === 'offline' && currentStatus === 'online') loginCount += 1;
        if (prev !== 'offline' && currentStatus === 'offline') logoutCount += 1;
        if (prev !== 'break' && currentStatus === 'break') breakCount += 1;
      }

      applyDuration(cursor, to, currentStatus);

      results.push({
        userId,
        rangeDays,
        from,
        to,
        loginCount,
        logoutCount,
        breakCount,
        seconds: totals,
      });
    }

    results.sort((a, b) => b.seconds.online + b.seconds.on_call - (a.seconds.online + a.seconds.on_call));

    return { rangeDays, from, to, items: results };
  }
}
