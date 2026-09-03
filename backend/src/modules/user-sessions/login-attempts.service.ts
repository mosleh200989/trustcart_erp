import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { LoginAttempt } from './entities/login-attempt.entity';
import { clientIpFromRequest, parseDeviceInfo } from './device-info';
import {
  LOGIN_THROTTLE_POLICY,
  ThrottleDecision,
  decideThrottle,
  normalizeIdentifier,
  throttleMessage,
} from './login-throttle-policy';

export type LoginResult = 'success' | 'invalid_password' | 'unknown_account' | 'inactive' | 'locked' | 'unlocked';

/** Results that count towards a lockout. */
const FAILURE_RESULTS = ['invalid_password', 'unknown_account', 'inactive'];

/** Results that end a failure streak: a real sign-in, or an admin clearing it. */
const RESET_RESULTS = ['success', 'unlocked'];

export interface RecordAttemptInput {
  identifier: string;
  result: LoginResult;
  request?: any;
  userId?: number | null;
  subjectType?: 'user' | 'customer' | null;
}

function toInt(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class LoginAttemptsService {
  private readonly logger = new Logger(LoginAttemptsService.name);

  /**
   * Identifiers and IPs already known to be locked, with the epoch ms they free
   * up. Purely a shortcut: it spares the database a pair of counting queries
   * per request while an attack is in progress. Losing it on restart is
   * harmless — the counts in the table produce the same answer.
   */
  private readonly knownLocks = new Map<string, number>();

  constructor(
    @InjectRepository(LoginAttempt)
    private readonly repo: Repository<LoginAttempt>,
  ) {}

  // ---------------------------------------------------------------- throttle

  /**
   * Decide whether this attempt may proceed. Called before the password is
   * checked, so a locked-out attacker learns nothing from timing.
   */
  async check(rawIdentifier: string, request?: any): Promise<ThrottleDecision> {
    const identifier = normalizeIdentifier(rawIdentifier);
    const ip = clientIpFromRequest(request);
    const now = Date.now();

    const cached = this.cachedLock(identifier, ip, now);
    if (cached) return cached;

    try {
      const [identifierWindow, ipWindow] = await Promise.all([
        this.identifierFailures(identifier),
        this.ipFailures(ip),
      ]);

      const decision = decideThrottle(identifierWindow, ipWindow, new Date(now));
      if (decision.blocked) {
        const key = decision.scope === 'ip' ? `ip:${ip}` : `id:${identifier}`;
        this.knownLocks.set(key, now + decision.retryAfterSeconds * 1000);
      }
      return decision;
    } catch (error: any) {
      // Never let bookkeeping refuse a legitimate sign-in.
      this.logger.error(`Login throttle check failed: ${error?.message || error}`);
      return { blocked: false, scope: null, retryAfterSeconds: 0 };
    }
  }

  private cachedLock(identifier: string, ip: string | null, now: number): ThrottleDecision | null {
    for (const [key, scope] of [
      [`id:${identifier}`, 'identifier'],
      [`ip:${ip}`, 'ip'],
    ] as const) {
      const until = this.knownLocks.get(key);
      if (!until) continue;
      if (until <= now) {
        this.knownLocks.delete(key);
        continue;
      }
      return { blocked: true, scope, retryAfterSeconds: Math.ceil((until - now) / 1000) };
    }
    return null;
  }

  /** Failures for this identifier since its last success or admin unlock. */
  private async identifierFailures(identifier: string) {
    if (!identifier) return { failures: 0, newestFailureAt: null };

    const [row] = await this.repo.query(
      `WITH last_reset AS (
         SELECT COALESCE(MAX(created_at), to_timestamp(0)) AS at
           FROM login_attempts
          WHERE identifier = $1 AND result = ANY($2::text[])
       )
       SELECT COUNT(*)::int AS failures, MAX(created_at) AS newest
         FROM login_attempts, last_reset
        WHERE identifier = $1
          AND result = ANY($3::text[])
          AND created_at > last_reset.at
          AND created_at > now() - ($4 || ' minutes')::interval`,
      [identifier, RESET_RESULTS, FAILURE_RESULTS, String(LOGIN_THROTTLE_POLICY.identifier.windowMinutes)],
    );

    return { failures: toInt(row?.failures), newestFailureAt: row?.newest ? new Date(row.newest) : null };
  }

  /** Failures from this address inside the window; successes do not clear it. */
  private async ipFailures(ip: string | null) {
    if (!ip) return { failures: 0, newestFailureAt: null };

    const [row] = await this.repo.query(
      `SELECT COUNT(*)::int AS failures, MAX(created_at) AS newest
         FROM login_attempts
        WHERE ip_address = $1
          AND result = ANY($2::text[])
          AND created_at > now() - ($3 || ' minutes')::interval`,
      [ip, FAILURE_RESULTS, String(LOGIN_THROTTLE_POLICY.ip.windowMinutes)],
    );

    return { failures: toInt(row?.failures), newestFailureAt: row?.newest ? new Date(row.newest) : null };
  }

  message(decision: ThrottleDecision) {
    return throttleMessage(decision);
  }

  // ------------------------------------------------------------------ record

  async record(input: RecordAttemptInput): Promise<void> {
    const userAgent = String(input.request?.headers?.['user-agent'] || '') || null;
    const device = parseDeviceInfo(userAgent);

    try {
      await this.repo.insert({
        identifier: normalizeIdentifier(input.identifier),
        userId: input.userId ?? null,
        subjectType: input.subjectType ?? null,
        result: input.result,
        ipAddress: clientIpFromRequest(input.request),
        deviceType: device.deviceType,
        deviceLabel: device.label,
        userAgent: userAgent ? userAgent.slice(0, 2000) : null,
      });

      if (RESET_RESULTS.includes(input.result)) {
        this.knownLocks.delete(`id:${normalizeIdentifier(input.identifier)}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to record login attempt: ${error?.message || error}`);
    }
  }

  /** Admin action: end a lockout now, without erasing the failures behind it. */
  async unlock(rawIdentifier: string, actorId?: number | null) {
    const identifier = normalizeIdentifier(rawIdentifier);
    if (!identifier) return { identifier, unlocked: false };

    await this.record({ identifier, result: 'unlocked', userId: actorId ?? null });
    this.knownLocks.delete(`id:${identifier}`);
    return { identifier, unlocked: true };
  }

  // -------------------------------------------------------------------- read

  async list(filters: { result?: string; q?: string; page?: number; limit?: number }) {
    const page = Math.max(1, toInt(filters.page, 1));
    const limit = Math.min(200, Math.max(1, toInt(filters.limit, 50)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    const result = String(filters.result || 'failures').toLowerCase();
    if (result === 'failures') {
      params.push(FAILURE_RESULTS);
      where.push(`a.result = ANY($${params.length}::text[])`);
    } else if (result !== 'all') {
      params.push(result);
      where.push(`a.result = $${params.length}`);
    }

    if (filters.q) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      const idx = params.length;
      where.push(`(a.identifier LIKE $${idx} OR LOWER(COALESCE(a.ip_address, '')) LIKE $${idx})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await this.repo.query(
      `SELECT a.id, a.identifier, a.result, a.ip_address, a.device_type, a.device_label,
              a.created_at, a.user_id,
              TRIM(COALESCE(u.name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name
         FROM login_attempts a
         LEFT JOIN users u ON u.id = a.user_id
         ${whereSql}
         ORDER BY a.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const [count] = await this.repo.query(
      `SELECT COUNT(*)::int AS total FROM login_attempts a ${whereSql}`,
      params,
    );

    return {
      rows: (rows || []).map((row: any) => ({
        id: Number(row.id),
        identifier: row.identifier,
        result: row.result,
        ipAddress: row.ip_address,
        deviceType: row.device_type,
        deviceLabel: row.device_label,
        createdAt: row.created_at,
        userId: row.user_id == null ? null : Number(row.user_id),
        userName: row.user_name || null,
      })),
      total: toInt(count?.total),
      page,
      limit,
    };
  }

  /** Counters and the currently locked identifiers, for the admin page. */
  async statistics() {
    const [totals] = await this.repo.query(
      `SELECT
         COUNT(*) FILTER (WHERE result = ANY($1::text[]) AND created_at >= date_trunc('day', now()))::int AS failed_today,
         COUNT(*) FILTER (WHERE result = ANY($1::text[]) AND created_at > now() - interval '7 days')::int  AS failed_7_days,
         COUNT(*) FILTER (WHERE result = ANY($1::text[]) AND created_at > now() - interval '1 hour')::int  AS failed_last_hour,
         COUNT(*) FILTER (WHERE result = 'success' AND created_at >= date_trunc('day', now()))::int        AS success_today,
         COUNT(DISTINCT identifier) FILTER (WHERE result = ANY($1::text[]) AND created_at > now() - interval '24 hours')::int AS identifiers_failing,
         COUNT(DISTINCT ip_address) FILTER (WHERE result = ANY($1::text[]) AND created_at > now() - interval '24 hours')::int AS ips_failing
       FROM login_attempts`,
      [FAILURE_RESULTS],
    );

    const locked = await this.repo.query(
      `WITH resets AS (
         SELECT identifier, MAX(created_at) AS at
           FROM login_attempts
          WHERE result = ANY($2::text[])
          GROUP BY identifier
       )
       SELECT a.identifier,
              COUNT(*)::int AS failures,
              MAX(a.created_at) AS newest_failure,
              MAX(a.created_at) + ($3 || ' minutes')::interval AS locked_until,
              MAX(a.ip_address) AS ip_address
         FROM login_attempts a
         LEFT JOIN resets r ON r.identifier = a.identifier
        WHERE a.result = ANY($1::text[])
          AND a.created_at > COALESCE(r.at, to_timestamp(0))
          AND a.created_at > now() - ($4 || ' minutes')::interval
        GROUP BY a.identifier
       HAVING COUNT(*) >= $5
          AND MAX(a.created_at) + ($3 || ' minutes')::interval > now()
        ORDER BY newest_failure DESC`,
      [
        FAILURE_RESULTS,
        RESET_RESULTS,
        String(LOGIN_THROTTLE_POLICY.identifier.lockMinutes),
        String(LOGIN_THROTTLE_POLICY.identifier.windowMinutes),
        LOGIN_THROTTLE_POLICY.identifier.maxFailures,
      ],
    );

    const topIps = await this.repo.query(
      `SELECT ip_address,
              COUNT(*)::int AS failures,
              COUNT(DISTINCT identifier)::int AS identifiers,
              MAX(created_at) AS newest
         FROM login_attempts
        WHERE result = ANY($1::text[])
          AND created_at > now() - interval '24 hours'
          AND ip_address IS NOT NULL
        GROUP BY ip_address
        ORDER BY failures DESC
        LIMIT 5`,
      [FAILURE_RESULTS],
    );

    const byResult = await this.repo.query(
      `SELECT result, COUNT(*)::int AS attempts
         FROM login_attempts
        WHERE created_at > now() - interval '7 days'
        GROUP BY result
        ORDER BY attempts DESC`,
    );

    return {
      policy: LOGIN_THROTTLE_POLICY,
      totals: {
        failedToday: toInt(totals?.failed_today),
        failedLast7Days: toInt(totals?.failed_7_days),
        failedLastHour: toInt(totals?.failed_last_hour),
        successToday: toInt(totals?.success_today),
        identifiersFailing24h: toInt(totals?.identifiers_failing),
        ipsFailing24h: toInt(totals?.ips_failing),
        lockedNow: (locked || []).length,
      },
      locked: (locked || []).map((row: any) => ({
        identifier: row.identifier,
        failures: toInt(row.failures),
        newestFailure: row.newest_failure,
        lockedUntil: row.locked_until,
        ipAddress: row.ip_address,
      })),
      topIps: (topIps || []).map((row: any) => ({
        ipAddress: row.ip_address,
        failures: toInt(row.failures),
        identifiers: toInt(row.identifiers),
        newest: row.newest,
      })),
      byResult: (byResult || []).map((row: any) => ({
        result: row.result,
        attempts: toInt(row.attempts),
      })),
    };
  }

  // ----------------------------------------------------------------- upkeep

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async pruneOldAttempts() {
    try {
      const result = await this.repo.query(
        `DELETE FROM login_attempts WHERE created_at < now() - interval '180 days' RETURNING id`,
      );
      // TypeORM hands back [rows, affected] for a RETURNING write.
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      if (rows?.length) this.logger.log(`Pruned ${rows.length} login attempts older than 180 days`);
    } catch (error: any) {
      this.logger.error(`Login attempt prune failed: ${error?.message || error}`);
    }
  }
}
