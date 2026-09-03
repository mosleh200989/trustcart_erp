import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { DataAccessLog } from './entities/data-access-log.entity';

export interface RecordAccessInput {
  userId?: number | null;
  userName?: string | null;
  resource: string;
  action: string;
  recordCount: number;
  recordId?: string | null;
  filters?: Record<string, any>;
  endpoint?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function toInt(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class DataAccessService {
  private readonly logger = new Logger(DataAccessService.name);

  constructor(
    @InjectRepository(DataAccessLog)
    private readonly repo: Repository<DataAccessLog>,
  ) {}

  /** Never throws: a failure to log must not fail the read it was watching. */
  async record(input: RecordAccessInput): Promise<void> {
    try {
      await this.repo.insert({
        userId: input.userId ?? null,
        userName: input.userName ? String(input.userName).slice(0, 190) : null,
        resource: input.resource,
        action: input.action,
        recordCount: toInt(input.recordCount),
        recordId: input.recordId ? String(input.recordId).slice(0, 100) : null,
        filters: input.filters || {},
        endpoint: input.endpoint ? String(input.endpoint).slice(0, 300) : null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ? String(input.userAgent).slice(0, 2000) : null,
      });
    } catch (error: any) {
      this.logger.error(`Failed to record data access: ${error?.message || error}`);
    }
  }

  async list(filters: {
    userId?: number;
    resource?: string;
    action?: string;
    minRecords?: number;
    days?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, toInt(filters.page, 1));
    const limit = Math.min(200, Math.max(1, toInt(filters.limit, 50)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    const days = Math.min(365, Math.max(1, toInt(filters.days, 30)));
    where.push(`l.created_at > now() - interval '${days} days'`);

    if (filters.userId) {
      params.push(filters.userId);
      where.push(`l.user_id = $${params.length}`);
    }
    if (filters.resource && filters.resource !== 'all') {
      params.push(filters.resource);
      where.push(`l.resource = $${params.length}`);
    }
    if (filters.action && filters.action !== 'all') {
      params.push(filters.action);
      where.push(`l.action = $${params.length}`);
    }
    if (filters.minRecords) {
      params.push(toInt(filters.minRecords));
      where.push(`l.record_count >= $${params.length}`);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const rows = await this.repo.query(
      `SELECT l.id, l.user_id, l.user_name, l.resource, l.action, l.record_count,
              l.record_id, l.filters, l.ip_address, l.created_at,
              r.name AS role_name
         FROM data_access_log l
         LEFT JOIN users u ON u.id = l.user_id
         LEFT JOIN roles r ON r.id = u.role_id
         ${whereSql}
         ORDER BY l.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const [count] = await this.repo.query(
      `SELECT COUNT(*)::int AS total FROM data_access_log l ${whereSql}`,
      params,
    );

    return {
      rows: (rows || []).map((row: any) => ({
        id: Number(row.id),
        userId: row.user_id == null ? null : Number(row.user_id),
        userName: row.user_name || null,
        roleName: row.role_name || null,
        resource: row.resource,
        action: row.action,
        recordCount: toInt(row.record_count),
        recordId: row.record_id,
        filters: row.filters || {},
        ipAddress: row.ip_address,
        createdAt: row.created_at,
      })),
      total: toInt(count?.total),
      page,
      limit,
    };
  }

  /**
   * Volume per reader, which is the number that matters: an agent reading four
   * thousand customer records in a day stands out against their own norm long
   * before anything else does.
   */
  async statistics(params?: { days?: number }) {
    const days = Math.min(365, Math.max(1, toInt(params?.days, 30)));

    const [totals] = await this.repo.query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int                    AS reads_today,
         COALESCE(SUM(record_count) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::int AS records_today,
         COUNT(*) FILTER (WHERE action = 'export' AND created_at >= date_trunc('day', now()))::int AS exports_today,
         COALESCE(SUM(record_count) FILTER (WHERE action = 'export' AND created_at > now() - interval '${days} days'), 0)::int AS records_exported,
         COUNT(DISTINCT user_id) FILTER (WHERE created_at >= date_trunc('day', now()))::int     AS readers_today,
         COALESCE(MAX(record_count) FILTER (WHERE created_at > now() - interval '${days} days'), 0)::int AS biggest_single_read,
         COUNT(*)::int                                                                          AS reads_recorded
       FROM data_access_log`,
    );

    const byUser = await this.repo.query(
      `SELECT
         l.user_id,
         COALESCE(MAX(l.user_name), 'Unknown')                                     AS user_name,
         MAX(r.name)                                                               AS role_name,
         COUNT(*)::int                                                             AS reads,
         COALESCE(SUM(l.record_count), 0)::int                                     AS records,
         COALESCE(SUM(l.record_count) FILTER (WHERE l.created_at >= date_trunc('day', now())), 0)::int AS records_today,
         COUNT(*) FILTER (WHERE l.action = 'export')::int                          AS exports,
         COALESCE(MAX(l.record_count), 0)::int                                     AS biggest_read,
         COUNT(DISTINCT date_trunc('day', l.created_at))::int                      AS active_days,
         MAX(l.created_at)                                                         AS last_read
       FROM data_access_log l
       LEFT JOIN users u ON u.id = l.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE l.created_at > now() - interval '${days} days'
       GROUP BY l.user_id
       ORDER BY records DESC
       LIMIT 50`,
    );

    const byResource = await this.repo.query(
      `SELECT resource, action, COUNT(*)::int AS reads, COALESCE(SUM(record_count), 0)::int AS records
         FROM data_access_log
        WHERE created_at > now() - interval '${days} days'
        GROUP BY resource, action
        ORDER BY records DESC`,
    );

    return {
      days,
      totals: {
        readsToday: toInt(totals?.reads_today),
        recordsToday: toInt(totals?.records_today),
        exportsToday: toInt(totals?.exports_today),
        recordsExported: toInt(totals?.records_exported),
        readersToday: toInt(totals?.readers_today),
        biggestSingleRead: toInt(totals?.biggest_single_read),
        readsRecorded: toInt(totals?.reads_recorded),
      },
      byUser: (byUser || []).map((row: any) => {
        const records = toInt(row.records);
        const activeDays = Math.max(1, toInt(row.active_days, 1));
        return {
          userId: row.user_id == null ? null : Number(row.user_id),
          userName: row.user_name,
          roleName: row.role_name || 'No role',
          reads: toInt(row.reads),
          records,
          recordsToday: toInt(row.records_today),
          exports: toInt(row.exports),
          biggestRead: toInt(row.biggest_read),
          activeDays,
          // Their own daily norm, so today can be read against it.
          averagePerDay: Math.round(records / activeDays),
          lastRead: row.last_read,
        };
      }),
      byResource: (byResource || []).map((row: any) => ({
        resource: row.resource,
        action: row.action,
        reads: toInt(row.reads),
        records: toInt(row.records),
      })),
    };
  }

  /** A year of read history is plenty; beyond that it is only storage. */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async pruneOldEntries() {
    try {
      const result = await this.repo.query(
        `DELETE FROM data_access_log WHERE created_at < now() - interval '365 days' RETURNING id`,
      );
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      if (rows?.length) this.logger.log(`Pruned ${rows.length} data access rows older than a year`);
    } catch (error: any) {
      this.logger.error(`Data access prune failed: ${error?.message || error}`);
    }
  }
}
