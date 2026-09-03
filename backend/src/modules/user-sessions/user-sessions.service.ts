import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { UserSession } from './entities/user-session.entity';
import { clientIpFromRequest, parseDeviceInfo } from './device-info';

/** Must match the JWT lifetime issued in AuthService. */
export const SESSION_TTL_HOURS = 24;

/** A session is "online" if it made a request inside this window. */
const DEFAULT_ONLINE_WINDOW_MINUTES = 15;

/**
 * last_seen_at is written at most this often per session. Every authenticated
 * request checks the session (so a revoke takes effect on the next request),
 * but writing on every request would add a row update to every API call.
 */
const TOUCH_INTERVAL_MS = 60_000;

export type SessionStatus = 'active' | 'revoked' | 'expired' | 'missing';

export interface CreateSessionInput {
  subjectType: 'user' | 'customer';
  userId?: number | null;
  customerId?: number | null;
  roleId?: number | null;
  request?: any;
}

interface ListFilters {
  subjectType?: string;
  status?: string;
  userId?: number;
  roleId?: number;
  deviceType?: string;
  q?: string;
  page?: number;
  limit?: number;
}

const ACTIVE_SQL = 's.revoked_at IS NULL AND s.expires_at > now()';

function toInt(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class UserSessionsService {
  private readonly logger = new Logger(UserSessionsService.name);

  /** sessionKey -> epoch ms of the last last_seen_at write. */
  private readonly lastTouchAt = new Map<string, number>();

  constructor(
    @InjectRepository(UserSession)
    private readonly repo: Repository<UserSession>,
  ) {}

  /**
   * TypeORM's raw `query()` returns the rows for a SELECT but `[rows, affected]`
   * for an INSERT/UPDATE/DELETE ... RETURNING. Counting the outer array there
   * reports 2 for every write, so unwrap it before counting.
   */
  private returnedRows(result: any): any[] {
    if (!Array.isArray(result)) return [];
    if (result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
      return result[0];
    }
    return result;
  }

  // ------------------------------------------------------------------ write

  /** Record a login and return the session key to embed in the token. */
  async createSession(input: CreateSessionInput): Promise<string | null> {
    const sessionKey = randomUUID();
    const userAgent = String(input.request?.headers?.['user-agent'] || '') || null;
    const device = parseDeviceInfo(userAgent);
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    try {
      await this.repo.insert({
        sessionKey,
        subjectType: input.subjectType,
        userId: input.subjectType === 'user' ? Number(input.userId) || null : null,
        customerId: input.subjectType === 'customer' ? Number(input.customerId) || null : null,
        roleId: input.roleId == null ? null : Number(input.roleId) || null,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        deviceLabel: device.label,
        userAgent: userAgent ? userAgent.slice(0, 2000) : null,
        ipAddress: clientIpFromRequest(input.request),
        lastSeenAt: new Date(),
        expiresAt,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
      });
      return sessionKey;
    } catch (error: any) {
      // Never block a login because session bookkeeping failed — the token is
      // still issued, it simply carries no sid and is treated as a legacy token.
      this.logger.error(`Failed to record login session: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Called on every authenticated request. Returns the session's status and
   * refreshes last_seen_at at most once per TOUCH_INTERVAL_MS.
   */
  async touch(sessionKey: string): Promise<{ status: SessionStatus; reason: string | null }> {
    if (!sessionKey) return { status: 'missing', reason: null };

    let rows: Array<{ revoked_at: Date | null; expired: boolean; revoke_reason: string | null }>;
    try {
      rows = await this.repo.query(
        `SELECT revoked_at, revoke_reason, (expires_at <= now()) AS expired
           FROM user_sessions
          WHERE session_key = $1
          LIMIT 1`,
        [sessionKey],
      );
    } catch (error: any) {
      // A missing table (migration not yet applied) must not lock everyone out.
      this.logger.error(`Session lookup failed: ${error?.message || error}`);
      return { status: 'active', reason: null };
    }

    const row = rows?.[0];
    if (!row) return { status: 'missing', reason: null };
    if (row.revoked_at) return { status: 'revoked', reason: row.revoke_reason };
    if (row.expired) return { status: 'expired', reason: null };

    const now = Date.now();
    const last = this.lastTouchAt.get(sessionKey) || 0;
    if (now - last > TOUCH_INTERVAL_MS) {
      this.lastTouchAt.set(sessionKey, now);
      this.repo
        .query('UPDATE user_sessions SET last_seen_at = now() WHERE session_key = $1', [sessionKey])
        .catch((error) => this.logger.error(`Failed to touch session: ${error?.message || error}`));
    }

    return { status: 'active', reason: null };
  }

  /** Sign one device out. Takes effect on that device's next request. */
  async revokeById(id: number, actorId?: number | null, reason = 'admin') {
    const session = await this.repo.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    if (!session.revokedAt) {
      await this.repo.update(
        { id },
        { revokedAt: new Date(), revokedBy: actorId ?? null, revokeReason: reason },
      );
      this.lastTouchAt.delete(session.sessionKey);
    }

    return { id, revoked: true };
  }

  /** Sign an account out of every device it is currently signed in on. */
  async revokeAllForSubject(
    subjectType: 'user' | 'customer',
    subjectId: number,
    actorId?: number | null,
    reason = 'admin-all',
  ) {
    const column = subjectType === 'customer' ? 'customer_id' : 'user_id';
    const rows = this.returnedRows(
      await this.repo.query(
        `UPDATE user_sessions
            SET revoked_at = now(), revoked_by = $2, revoke_reason = $3
          WHERE ${column} = $1
            AND subject_type = $4
            AND revoked_at IS NULL
            AND expires_at > now()
          RETURNING session_key`,
        [subjectId, actorId ?? null, reason, subjectType],
      ),
    );

    for (const row of rows) this.lastTouchAt.delete(row.session_key);
    return { revoked: rows.length };
  }

  /** Used by logout, so a signed-out device stops counting as active. */
  async revokeByKey(sessionKey: string, reason = 'logout') {
    if (!sessionKey) return { revoked: 0 };
    const rows = this.returnedRows(
      await this.repo.query(
        `UPDATE user_sessions
            SET revoked_at = now(), revoke_reason = $2
          WHERE session_key = $1 AND revoked_at IS NULL
          RETURNING id`,
        [sessionKey, reason],
      ),
    );
    this.lastTouchAt.delete(sessionKey);
    return { revoked: rows.length };
  }

  // ------------------------------------------------------------------- read

  async list(filters: ListFilters) {
    const page = Math.max(1, toInt(filters.page, 1));
    const limit = Math.min(200, Math.max(1, toInt(filters.limit, 50)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    const status = String(filters.status || 'active').toLowerCase();
    if (status === 'active') where.push(ACTIVE_SQL);
    else if (status === 'revoked') where.push('s.revoked_at IS NOT NULL');
    else if (status === 'expired') where.push('s.revoked_at IS NULL AND s.expires_at <= now()');

    if (filters.subjectType && filters.subjectType !== 'all') {
      params.push(filters.subjectType);
      where.push(`s.subject_type = $${params.length}`);
    }
    if (filters.userId) {
      params.push(filters.userId);
      where.push(`s.user_id = $${params.length}`);
    }
    if (filters.roleId) {
      params.push(filters.roleId);
      where.push(`u.role_id = $${params.length}`);
    }
    if (filters.deviceType && filters.deviceType !== 'all') {
      params.push(filters.deviceType);
      where.push(`s.device_type = $${params.length}`);
    }
    if (filters.q) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      const idx = params.length;
      where.push(
        `(LOWER(COALESCE(u.name, '') || ' ' || COALESCE(u.last_name, '')) LIKE $${idx}
          OR LOWER(COALESCE(u.email, '')) LIKE $${idx}
          OR LOWER(COALESCE(c.name, '')) LIKE $${idx}
          OR LOWER(COALESCE(c.email, '')) LIKE $${idx}
          OR LOWER(COALESCE(s.ip_address, '')) LIKE $${idx}
          OR LOWER(COALESCE(s.device_label, '')) LIKE $${idx})`,
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await this.repo.query(
      `SELECT
         s.id,
         s.session_key,
         s.subject_type,
         s.user_id,
         s.customer_id,
         TRIM(COALESCE(u.name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name,
         u.email AS user_email,
         COALESCE(c.name, '') AS customer_name,
         c.email AS customer_email,
         r.id   AS role_id,
         r.name AS role_name,
         r.slug AS role_slug,
         s.device_type, s.browser, s.os, s.device_label, s.ip_address,
         s.created_at, s.last_seen_at, s.expires_at,
         s.revoked_at, s.revoke_reason,
         TRIM(COALESCE(ru.name, '') || ' ' || COALESCE(ru.last_name, '')) AS revoked_by_name,
         (s.revoked_at IS NULL AND s.expires_at > now()) AS is_active
       FROM user_sessions s
       LEFT JOIN users u     ON u.id = s.user_id
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN roles r     ON r.id = u.role_id
       LEFT JOIN users ru    ON ru.id = s.revoked_by
       ${whereSql}
       ORDER BY s.last_seen_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const countRows = await this.repo.query(
      `SELECT COUNT(*)::int AS total
         FROM user_sessions s
         LEFT JOIN users u     ON u.id = s.user_id
         LEFT JOIN customers c ON c.id = s.customer_id
         ${whereSql}`,
      params,
    );

    return {
      rows: (rows || []).map((row: any) => ({
        id: Number(row.id),
        subjectType: row.subject_type,
        userId: row.user_id == null ? null : Number(row.user_id),
        customerId: row.customer_id == null ? null : Number(row.customer_id),
        accountName:
          (row.subject_type === 'customer' ? row.customer_name : row.user_name) ||
          row.user_email ||
          row.customer_email ||
          `#${row.user_id ?? row.customer_id ?? '?'}`,
        accountEmail: row.subject_type === 'customer' ? row.customer_email : row.user_email,
        roleId: row.role_id == null ? null : Number(row.role_id),
        roleName: row.role_name || null,
        roleSlug: row.role_slug || null,
        deviceType: row.device_type,
        browser: row.browser,
        os: row.os,
        deviceLabel: row.device_label,
        ipAddress: row.ip_address,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        revokeReason: row.revoke_reason,
        revokedByName: row.revoked_by_name || null,
        isActive: Boolean(row.is_active),
      })),
      total: toInt(countRows?.[0]?.total, 0),
      page,
      limit,
    };
  }

  /**
   * Every number the sessions page shows: overall totals, then the same
   * counts sliced by role, by device and by account.
   */
  async statistics(params?: { windowMinutes?: number }) {
    const windowMinutes = Math.min(
      1440,
      Math.max(1, toInt(params?.windowMinutes, DEFAULT_ONLINE_WINDOW_MINUTES)),
    );
    const onlineSql = `s.last_seen_at > now() - interval '${windowMinutes} minutes'`;

    const [totals] = await this.repo.query(
      `SELECT
         COUNT(*) FILTER (WHERE ${ACTIVE_SQL})::int                                    AS active_sessions,
         COUNT(*) FILTER (WHERE ${ACTIVE_SQL} AND ${onlineSql})::int                   AS online_sessions,
         COUNT(DISTINCT s.user_id) FILTER (WHERE ${ACTIVE_SQL} AND s.subject_type = 'user')::int     AS active_staff,
         COUNT(DISTINCT s.customer_id) FILTER (WHERE ${ACTIVE_SQL} AND s.subject_type = 'customer')::int AS active_customers,
         COUNT(DISTINCT s.user_id) FILTER (WHERE ${ACTIVE_SQL} AND ${onlineSql} AND s.subject_type = 'user')::int AS online_staff,
         COUNT(DISTINCT s.ip_address) FILTER (WHERE ${ACTIVE_SQL})::int                AS distinct_ips,
         COUNT(*) FILTER (WHERE s.created_at >= date_trunc('day', now()))::int         AS logins_today,
         COUNT(*) FILTER (WHERE s.created_at >= now() - interval '7 days')::int        AS logins_last_7_days,
         COUNT(*) FILTER (WHERE s.revoked_at >= date_trunc('day', now()))::int         AS revoked_today,
         COUNT(*)::int                                                                 AS sessions_recorded
       FROM user_sessions s`,
    );

    const [staffShape] = await this.repo.query(
      `WITH per_user AS (
         SELECT s.user_id, COUNT(*)::int AS sessions
           FROM user_sessions s
          WHERE ${ACTIVE_SQL} AND s.subject_type = 'user' AND s.user_id IS NOT NULL
          GROUP BY s.user_id
       )
       SELECT
         COALESCE(MAX(sessions), 0)::int                        AS max_devices_one_account,
         COUNT(*) FILTER (WHERE sessions > 1)::int              AS multi_device_accounts,
         COALESCE(ROUND(AVG(sessions)::numeric, 2), 0)          AS avg_devices_per_account
       FROM per_user`,
    );

    const [staffTotals] = await this.repo.query(
      `SELECT COUNT(*)::int AS staff_total
         FROM users u
        WHERE u.is_deleted = false AND u.status = 'active'`,
    );

    const byRole = await this.repo.query(
      `SELECT
         r.id   AS role_id,
         r.name AS role_name,
         r.slug AS role_slug,
         COUNT(DISTINCT u.id)::int                                                       AS staff_total,
         COUNT(DISTINCT u.id) FILTER (WHERE ${ACTIVE_SQL})::int                          AS accounts_signed_in,
         COUNT(s.id) FILTER (WHERE ${ACTIVE_SQL})::int                                   AS active_sessions,
         COUNT(s.id) FILTER (WHERE ${ACTIVE_SQL} AND ${onlineSql})::int                  AS online_sessions,
         COUNT(DISTINCT s.device_type) FILTER (WHERE ${ACTIVE_SQL})::int                 AS device_kinds
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN user_sessions s
              ON s.user_id = u.id AND s.subject_type = 'user'
       WHERE u.is_deleted = false AND u.status = 'active'
       GROUP BY r.id, r.name, r.slug
       ORDER BY active_sessions DESC, staff_total DESC, r.name ASC`,
    );

    const byDevice = await this.repo.query(
      `SELECT
         s.device_type,
         COUNT(*)::int                                              AS sessions,
         COUNT(DISTINCT COALESCE(s.user_id, -s.customer_id))::int   AS accounts,
         COUNT(*) FILTER (WHERE ${onlineSql})::int                  AS online_sessions
       FROM user_sessions s
       WHERE ${ACTIVE_SQL}
       GROUP BY s.device_type
       ORDER BY sessions DESC`,
    );

    const byBrowser = await this.repo.query(
      `SELECT
         COALESCE(s.browser, 'Unknown') AS browser,
         COUNT(*)::int                                              AS sessions,
         COUNT(DISTINCT COALESCE(s.user_id, -s.customer_id))::int   AS accounts
       FROM user_sessions s
       WHERE ${ACTIVE_SQL}
       GROUP BY COALESCE(s.browser, 'Unknown')
       ORDER BY sessions DESC`,
    );

    const byOs = await this.repo.query(
      `SELECT
         COALESCE(s.os, 'Unknown') AS os,
         COUNT(*)::int                                              AS sessions,
         COUNT(DISTINCT COALESCE(s.user_id, -s.customer_id))::int   AS accounts
       FROM user_sessions s
       WHERE ${ACTIVE_SQL}
       GROUP BY COALESCE(s.os, 'Unknown')
       ORDER BY sessions DESC`,
    );

    const byUser = await this.repo.query(
      `SELECT
         u.id AS user_id,
         TRIM(COALESCE(u.name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name,
         u.email,
         r.name AS role_name,
         r.slug AS role_slug,
         COUNT(s.id)::int                                            AS active_sessions,
         COUNT(DISTINCT s.device_type)::int                          AS device_kinds,
         COUNT(DISTINCT s.ip_address)::int                           AS distinct_ips,
         COUNT(*) FILTER (WHERE ${onlineSql})::int                   AS online_sessions,
         MIN(s.created_at)                                           AS first_login_at,
         MAX(s.last_seen_at)                                         AS last_seen_at,
         STRING_AGG(DISTINCT s.device_label, ', ' ORDER BY s.device_label) AS devices
       FROM user_sessions s
       INNER JOIN users u ON u.id = s.user_id
       LEFT JOIN roles r  ON r.id = u.role_id
       WHERE ${ACTIVE_SQL} AND s.subject_type = 'user'
       GROUP BY u.id, u.name, u.last_name, u.email, r.name, r.slug
       ORDER BY active_sessions DESC, last_seen_at DESC`,
    );

    const activeStaff = toInt(totals?.active_staff, 0);
    const staffTotal = toInt(staffTotals?.staff_total, 0);

    return {
      windowMinutes,
      generatedAt: new Date().toISOString(),
      totals: {
        activeSessions: toInt(totals?.active_sessions),
        onlineSessions: toInt(totals?.online_sessions),
        activeStaffAccounts: activeStaff,
        onlineStaffAccounts: toInt(totals?.online_staff),
        activeCustomerAccounts: toInt(totals?.active_customers),
        staffTotal,
        staffSignedOut: Math.max(0, staffTotal - activeStaff),
        multiDeviceAccounts: toInt(staffShape?.multi_device_accounts),
        maxDevicesOneAccount: toInt(staffShape?.max_devices_one_account),
        avgDevicesPerAccount: Number(staffShape?.avg_devices_per_account || 0),
        distinctIps: toInt(totals?.distinct_ips),
        loginsToday: toInt(totals?.logins_today),
        loginsLast7Days: toInt(totals?.logins_last_7_days),
        revokedToday: toInt(totals?.revoked_today),
        sessionsRecorded: toInt(totals?.sessions_recorded),
      },
      byRole: (byRole || []).map((row: any) => ({
        roleId: row.role_id == null ? null : Number(row.role_id),
        roleName: row.role_name || 'No role',
        roleSlug: row.role_slug || null,
        staffTotal: toInt(row.staff_total),
        accountsSignedIn: toInt(row.accounts_signed_in),
        activeSessions: toInt(row.active_sessions),
        onlineSessions: toInt(row.online_sessions),
        deviceKinds: toInt(row.device_kinds),
      })),
      byDevice: (byDevice || []).map((row: any) => ({
        deviceType: row.device_type || 'unknown',
        sessions: toInt(row.sessions),
        accounts: toInt(row.accounts),
        onlineSessions: toInt(row.online_sessions),
      })),
      byBrowser: (byBrowser || []).map((row: any) => ({
        browser: row.browser,
        sessions: toInt(row.sessions),
        accounts: toInt(row.accounts),
      })),
      byOs: (byOs || []).map((row: any) => ({
        os: row.os,
        sessions: toInt(row.sessions),
        accounts: toInt(row.accounts),
      })),
      byUser: (byUser || []).map((row: any) => ({
        userId: Number(row.user_id),
        userName: row.user_name || row.email || `#${row.user_id}`,
        email: row.email || null,
        roleName: row.role_name || 'No role',
        roleSlug: row.role_slug || null,
        activeSessions: toInt(row.active_sessions),
        deviceKinds: toInt(row.device_kinds),
        distinctIps: toInt(row.distinct_ips),
        onlineSessions: toInt(row.online_sessions),
        firstLoginAt: row.first_login_at,
        lastSeenAt: row.last_seen_at,
        devices: row.devices || '',
      })),
    };
  }

  /** Sessions for one account, newest activity first. */
  async listForSubject(subjectType: 'user' | 'customer', subjectId: number, status = 'active') {
    return this.list({
      subjectType,
      status,
      userId: subjectType === 'user' ? subjectId : undefined,
      limit: 200,
    });
  }

  // ---------------------------------------------------------------- upkeep

  /**
   * Expired rows stay readable for a while (an admin looking at "who signed in
   * yesterday" wants them), then go. Nothing here revokes anything: expiry is
   * already enforced by expires_at on every request.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async pruneOldSessions() {
    try {
      const removed = this.returnedRows(
        await this.repo.query(
          `DELETE FROM user_sessions
            WHERE expires_at < now() - interval '90 days'
            RETURNING id`,
        ),
      ).length;
      if (removed) this.logger.log(`Pruned ${removed} session rows older than 90 days`);

      // Keys for sessions that can no longer be active are dead weight.
      this.lastTouchAt.clear();
    } catch (error: any) {
      this.logger.error(`Session prune failed: ${error?.message || error}`);
    }
  }
}
