import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { User } from '../users/user.entity';
import { UserPresenceEvent } from './entities/user-presence-event.entity';
import { UserPresenceState, UserPresenceStatus } from './entities/user-presence-status.entity';
import { PresenceSettings } from './entities/presence-settings.entity';
import { UserOfficeTime } from './entities/user-office-time.entity';
import { PresenceCalendarOverride } from './entities/presence-calendar-override.entity';
import { SalesService } from '../sales/sales.service';

function parseDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function clampInt(value: any, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function safeState(value: any): UserPresenceState {
  return value === 'online' ? 'online' : 'offline';
}

function cleanAttendanceKey(value: any, fallback: string): string {
  return String(value ?? fallback).trim().slice(0, 10) || fallback;
}

function cleanAttendanceLabel(value: any, fallback: string): string {
  return String(value ?? fallback).trim().slice(0, 100) || fallback;
}

function cleanColor(value: any, fallback: string): string {
  const next = String(value ?? fallback).trim();
  return /^#[0-9a-fA-F]{6}$/.test(next) ? next : fallback;
}

const PRESENCE_STALE_TIMEOUT_MS = 10 * 60 * 1000;

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly autoAssignmentDrainAtByUser = new Map<number, number>();

  constructor(
    @InjectRepository(UserPresenceStatus)
    private readonly statusRepo: Repository<UserPresenceStatus>,
    @InjectRepository(UserPresenceEvent)
    private readonly eventRepo: Repository<UserPresenceEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PresenceSettings)
    private readonly settingsRepo: Repository<PresenceSettings>,
    @InjectRepository(UserOfficeTime)
    private readonly officeTimeRepo: Repository<UserOfficeTime>,
    @InjectRepository(PresenceCalendarOverride)
    private readonly calendarOverrideRepo: Repository<PresenceCalendarOverride>,
    private readonly salesService: SalesService,
  ) {}

  private getRange(params?: { from?: string; to?: string; rangeDays?: number }) {
    const to = parseDate(params?.to) ?? new Date();
    const rangeDays = clampInt(params?.rangeDays, 1, 3650, 7);
    const from = parseDate(params?.from) ?? new Date(to.getTime() - rangeDays * 24 * 3600 * 1000);
    return { from, to, rangeDays };
  }

  private async getOrCreateStatus(userId: number) {
    let status = await this.statusRepo.findOne({ where: { userId } });
    if (status) return status;

    status = this.statusRepo.create({
      userId,
      state: 'offline',
      lastChangedAt: new Date(0),
      lastSeenAt: null,
      source: 'system',
    });
    return this.statusRepo.save(status);
  }

  private async unassignWorkForOfflineUser(userId: number): Promise<{
    customers: number;
    salesOrders: number;
    incompleteOrders: number;
  }> {
    const userIdNum = Number(userId);
    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
      return { customers: 0, salesOrders: 0, incompleteOrders: 0 };
    }

    const tableRows = await this.statusRepo.manager.query(
      `SELECT to_regclass('public.automatic_order_assignment_settings') AS table_name`,
    );
    if (!tableRows?.[0]?.table_name) {
      return { customers: 0, salesOrders: 0, incompleteOrders: 0 };
    }

    const enabledRows = await this.statusRepo.manager.query(
      `SELECT s.team_leader_id
       FROM users u
       INNER JOIN automatic_order_assignment_settings s
         ON s.team_leader_id = u.team_leader_id
        AND s.is_enabled = TRUE
       WHERE u.id = $1
         AND COALESCE(u.is_deleted, FALSE) = FALSE
         AND COALESCE(u.status, 'active') = 'active'
       LIMIT 1`,
      [userIdNum],
    );
    const hasEnabledAutomaticAssignment = enabledRows.length > 0;

    if (!hasEnabledAutomaticAssignment) {
      return { customers: 0, salesOrders: 0, incompleteOrders: 0 };
    }

    const customerResult = await this.statusRepo.manager.query(
      `UPDATE customers c
       SET assigned_to = NULL,
           updated_at = NOW()
       WHERE c.assigned_to = $1
         AND EXISTS (
           SELECT 1
           FROM automatic_order_assignment_settings s
           WHERE s.team_leader_id = c.assigned_supervisor_id
             AND s.is_enabled = TRUE
         )`,
      [userIdNum],
    );
    const salesOrderResult = await this.statusRepo.manager.query(
      `UPDATE sales_orders
       SET assigned_to = NULL,
           assigned_by = NULL,
           assigned_at = NULL,
           updated_at = NOW()
       WHERE assigned_to = $1`,
      [userIdNum],
    );
    const incompleteOrderResult = await this.statusRepo.manager.query(
      `UPDATE incomplete_orders
       SET assigned_to = NULL,
           assigned_by = NULL,
           assigned_at = NULL,
           updated_at = NOW()
       WHERE assigned_to = $1`,
      [userIdNum],
    );

    return {
      customers: Number(customerResult?.[1] ?? 0),
      salesOrders: Number(salesOrderResult?.[1] ?? 0),
      incompleteOrders: Number(incompleteOrderResult?.[1] ?? 0),
    };
  }

  private async runAutomaticAssignmentForOnlineUser(userId: number, options: { force?: boolean } = {}): Promise<void> {
    const userIdNum = Number(userId);
    if (!Number.isFinite(userIdNum) || userIdNum <= 0) return;
    const now = Date.now();
    const lastRunAt = this.autoAssignmentDrainAtByUser.get(userIdNum) || 0;
    if (!options.force && now - lastRunAt < 60_000) return;
    this.autoAssignmentDrainAtByUser.set(userIdNum, now);

    try {
      const rows = await this.statusRepo.manager.query(
        `SELECT
           u.team_leader_id AS "teamLeaderId",
           LOWER(COALESCE(r.slug, '')) AS "roleSlug"
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1
           AND COALESCE(u.is_deleted, FALSE) = FALSE
           AND COALESCE(u.status, 'active') = 'active'
         LIMIT 1`,
        [userIdNum],
      );
      const user = rows?.[0];
      const roleSlug = String(user?.roleSlug || '').toLowerCase();
      const teamLeaderId =
        roleSlug === 'sales-team-leader'
          ? userIdNum
          : Number(user?.teamLeaderId || 0);

      if (!Number.isFinite(teamLeaderId) || teamLeaderId <= 0) return;

      await this.salesService.runAutomaticAssignmentQueue({
        teamLeaderId,
        limit: 500,
        reason: 'agent_online_queue_drain',
      });
    } catch (err: any) {
      this.logger.warn(`Automatic assignment queue drain failed for online user ${userIdNum}: ${err?.message || err}`);
    }
  }

  async expireStaleOnlineStatuses(userIds?: number[]) {
    const cutoff = new Date(Date.now() - PRESENCE_STALE_TIMEOUT_MS);
    const qb = this.statusRepo
      .createQueryBuilder('status')
      .where('status.state = :state', { state: 'online' })
      .andWhere('(status.lastSeenAt IS NULL OR status.lastSeenAt <= :cutoff)', { cutoff });

    const cleanUserIds = Array.isArray(userIds)
      ? Array.from(new Set(userIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)))
      : [];
    if (cleanUserIds.length > 0) qb.andWhere('status.userId IN (:...userIds)', { userIds: cleanUserIds });

    const staleStatuses = await qb.getMany();
    for (const status of staleStatuses) {
      const lastSeen = status.lastSeenAt ? new Date(status.lastSeenAt) : null;
      const offlineAt = lastSeen ? new Date(lastSeen.getTime() + PRESENCE_STALE_TIMEOUT_MS) : cutoff;
      const occurredAt = offlineAt.getTime() > Date.now() ? new Date() : offlineAt;

      const event = this.eventRepo.create({
        userId: Number(status.userId),
        state: 'offline',
        source: 'idle-timeout',
        occurredAt,
      });
      await this.eventRepo.save(event);

      status.state = 'offline';
      status.source = 'idle-timeout';
      status.lastChangedAt = occurredAt;
      await this.statusRepo.save(status);
      await this.unassignWorkForOfflineUser(Number(status.userId));
    }

    return { expired: staleStatuses.length };
  }

  async getMyStatus(userId: number) {
    await this.expireStaleOnlineStatuses([Number(userId)]);
    return this.getOrCreateStatus(Number(userId));
  }

  async setMyStatus(userId: number, stateRaw: any, source = 'manual') {
    const userIdNum = Number(userId);
    const state = safeState(stateRaw);
    const now = new Date();
    const status = await this.getOrCreateStatus(userIdNum);
    const previousState = status.state;

    if (status.state !== state) {
      const event = this.eventRepo.create({
        userId: userIdNum,
        state,
        source,
        occurredAt: now,
      });
      await this.eventRepo.save(event);
      status.lastChangedAt = now;
    }

    status.state = state;
    status.source = source;
    status.lastSeenAt = now;
    const saved = await this.statusRepo.save(status);
    if (state === 'offline') {
      await this.unassignWorkForOfflineUser(userIdNum);
    } else if (state === 'online' && previousState !== 'online') {
      await this.runAutomaticAssignmentForOnlineUser(userIdNum, { force: true });
    }
    return saved;
  }

  async heartbeat(userId: number) {
    const userIdNum = Number(userId);
    const status = await this.getOrCreateStatus(userIdNum);
    const now = new Date();
    const lastSeen = status.lastSeenAt ? new Date(status.lastSeenAt).getTime() : 0;

    let saved = status;
    // Only update lastSeenAt and save to DB if state changed or last seen was > 30 seconds ago
    if (status.state !== 'online' || now.getTime() - lastSeen > 30_000) {
      status.lastSeenAt = now;
      saved = await this.statusRepo.save(status);
    }

    if (saved.state === 'online') {
      await this.runAutomaticAssignmentForOnlineUser(userIdNum);
    }
    return saved;
  }

  async getSettings() {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (settings) return settings;

    settings = this.settingsRepo.create({
      id: 1,
      officeStartTime: '09:00',
      officeEndTime: '18:00',
      timezone: 'Asia/Dhaka',
      attendanceKey: '1HS4-6TSSmYRj-D6_ntJ9OyQITNfVyJRMZUN-d-ZN6C8',
      attendancePresentKey: 'P',
      attendancePresentLabel: 'Present',
      attendanceLateKey: 'L',
      attendanceLateLabel: 'Late',
      attendanceWeeklyOffKey: 'W',
      attendanceWeeklyOffLabel: 'Weekly off day',
      attendanceExcusedAbsenceKey: 'U',
      attendanceExcusedAbsenceLabel: 'Excused absence',
      attendanceUnexcusedAbsenceKey: 'A',
      attendanceUnexcusedAbsenceLabel: 'Unexcused absence',
      attendancePresentColor: '#16a34a',
      attendanceLateColor: '#f59e0b',
      attendanceWeeklyOffColor: '#64748b',
      attendanceExcusedAbsenceColor: '#2563eb',
      attendanceUnexcusedAbsenceColor: '#dc2626',
      calendarTeamGapEvery: 0,
      calendarTeamGapSize: 12,
      calendarUserOrder: null,
      telegramRemindersEnabled: false,
      telegramReminderLeadMinutes: 5,
      telegramOfflineReminderMessage: 'Hi {name}, your office time starts at {startTime}. Please come online if you are starting work.',
      telegramOnlineThankYouMessage: 'Thank you {name}. You are online on time for your {startTime} office start.',
      googleSpreadsheetId: '1HS4-6TSSmYRj-D6_ntJ9OyQITNfVyJRMZUN-d-ZN6C8',
      summarySheetName: 'May-26',
      eventsSheetName: '',
      settingsSheetName: 'Attendance key',
    });
    return this.settingsRepo.save(settings);
  }

  async updateSettings(input: Partial<PresenceSettings>) {
    const settings = await this.getSettings();
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const nextOfficeStart = input.officeStartTime ?? settings.officeStartTime;
    const nextOfficeEnd = input.officeEndTime ?? settings.officeEndTime;

    if (!timePattern.test(String(nextOfficeStart))) throw new BadRequestException('Office start time must be HH:mm');
    if (!timePattern.test(String(nextOfficeEnd))) throw new BadRequestException('Office end time must be HH:mm');

    settings.officeStartTime = String(nextOfficeStart);
    settings.officeEndTime = String(nextOfficeEnd);
    settings.timezone = String(input.timezone ?? settings.timezone ?? 'Asia/Dhaka');
    settings.attendanceKey = input.attendanceKey == null ? settings.attendanceKey : String(input.attendanceKey || '').trim() || null;
    settings.attendancePresentKey = cleanAttendanceKey(input.attendancePresentKey, settings.attendancePresentKey || 'P');
    settings.attendancePresentLabel = cleanAttendanceLabel(input.attendancePresentLabel, settings.attendancePresentLabel || 'Present');
    settings.attendanceLateKey = cleanAttendanceKey(input.attendanceLateKey, settings.attendanceLateKey || 'L');
    settings.attendanceLateLabel = cleanAttendanceLabel(input.attendanceLateLabel, settings.attendanceLateLabel || 'Late');
    settings.attendanceWeeklyOffKey = cleanAttendanceKey(input.attendanceWeeklyOffKey, settings.attendanceWeeklyOffKey || 'W');
    settings.attendanceWeeklyOffLabel = cleanAttendanceLabel(input.attendanceWeeklyOffLabel, settings.attendanceWeeklyOffLabel || 'Weekly off day');
    settings.attendanceExcusedAbsenceKey = cleanAttendanceKey(input.attendanceExcusedAbsenceKey, settings.attendanceExcusedAbsenceKey || 'U');
    settings.attendanceExcusedAbsenceLabel = cleanAttendanceLabel(input.attendanceExcusedAbsenceLabel, settings.attendanceExcusedAbsenceLabel || 'Excused absence');
    settings.attendanceUnexcusedAbsenceKey = cleanAttendanceKey(input.attendanceUnexcusedAbsenceKey, settings.attendanceUnexcusedAbsenceKey || 'A');
    settings.attendanceUnexcusedAbsenceLabel = cleanAttendanceLabel(
      input.attendanceUnexcusedAbsenceLabel,
      settings.attendanceUnexcusedAbsenceLabel || 'Unexcused absence',
    );
    settings.attendancePresentColor = cleanColor(input.attendancePresentColor, settings.attendancePresentColor || '#16a34a');
    settings.attendanceLateColor = cleanColor(input.attendanceLateColor, settings.attendanceLateColor || '#f59e0b');
    settings.attendanceWeeklyOffColor = cleanColor(input.attendanceWeeklyOffColor, settings.attendanceWeeklyOffColor || '#64748b');
    settings.attendanceExcusedAbsenceColor = cleanColor(input.attendanceExcusedAbsenceColor, settings.attendanceExcusedAbsenceColor || '#2563eb');
    settings.attendanceUnexcusedAbsenceColor = cleanColor(input.attendanceUnexcusedAbsenceColor, settings.attendanceUnexcusedAbsenceColor || '#dc2626');
    settings.calendarTeamGapEvery = clampInt((input as any).calendarTeamGapEvery, 0, 100, settings.calendarTeamGapEvery || 0);
    settings.calendarTeamGapSize = clampInt((input as any).calendarTeamGapSize, 0, 80, settings.calendarTeamGapSize || 12);
    settings.telegramRemindersEnabled = Boolean((input as any).telegramRemindersEnabled);
    settings.telegramReminderLeadMinutes = clampInt((input as any).telegramReminderLeadMinutes, 1, 120, settings.telegramReminderLeadMinutes || 5);
    settings.telegramOfflineReminderMessage =
      String((input as any).telegramOfflineReminderMessage ?? settings.telegramOfflineReminderMessage ?? '').trim().slice(0, 2000) ||
      'Hi {name}, your office time starts at {startTime}. Please come online if you are starting work.';
    settings.telegramOnlineThankYouMessage =
      String((input as any).telegramOnlineThankYouMessage ?? settings.telegramOnlineThankYouMessage ?? '').trim().slice(0, 2000) ||
      'Thank you {name}. You are online on time for your {startTime} office start.';
    settings.googleSpreadsheetId =
      input.googleSpreadsheetId == null ? settings.googleSpreadsheetId : String(input.googleSpreadsheetId || '').trim() || null;
    settings.summarySheetName = String(input.summarySheetName ?? settings.summarySheetName ?? this.getDefaultMonthSheetName()).trim() || this.getDefaultMonthSheetName();
    settings.eventsSheetName = String(input.eventsSheetName ?? settings.eventsSheetName ?? '').trim();
    settings.settingsSheetName = String(input.settingsSheetName ?? settings.settingsSheetName ?? 'Attendance key').trim() || 'Attendance key';

    return this.settingsRepo.save(settings);
  }

  async getDashboard(params?: { from?: string; to?: string; rangeDays?: number; userId?: number }) {
    const { from, to, rangeDays } = this.getRange(params);
    const users = await this.userRepo.find({
      where: { isDeleted: false } as any,
      order: { name: 'ASC', lastName: 'ASC' } as any,
    });

    const allowedUsers = params?.userId
      ? users.filter((u) => Number(u.id) === Number(params.userId))
      : users;
    const userIds = allowedUsers.map((u) => Number(u.id));
    await this.expireStaleOnlineStatuses(userIds);

    const statuses = userIds.length
      ? await this.statusRepo.find({ where: { userId: In(userIds) } as any })
      : [];
    const statusByUser = new Map(statuses.map((s) => [Number(s.userId), s]));

    const eventsInRange = userIds.length
      ? await this.eventRepo
          .createQueryBuilder('e')
          .where('e.userId IN (:...userIds)', { userIds })
          .andWhere('e.occurredAt >= :from AND e.occurredAt <= :to', { from, to })
          .orderBy('e.userId', 'ASC')
          .addOrderBy('e.occurredAt', 'ASC')
          .getMany()
      : [];

    const baselineRows = userIds.length
      ? await this.eventRepo.query(
          `SELECT DISTINCT ON (user_id)
            id, user_id as "userId", state, source, occurred_at as "occurredAt", created_at as "createdAt"
          FROM user_presence_events
          WHERE user_id = ANY($1) AND occurred_at < $2
          ORDER BY user_id, occurred_at DESC`,
          [userIds, from],
        )
      : [];

    const eventsByUser = new Map<number, UserPresenceEvent[]>();
    for (const ev of [...(baselineRows || []), ...eventsInRange]) {
      const userId = Number(ev.userId);
      const list = eventsByUser.get(userId) || [];
      list.push(ev);
      eventsByUser.set(userId, list);
    }

    const items = allowedUsers.map((user) => {
      const userId = Number(user.id);
      const status = statusByUser.get(userId);
      const events = (eventsByUser.get(userId) || []).slice().sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      );

      let currentState: UserPresenceState = 'offline';
      const baseline = events.filter((e) => new Date(e.occurredAt).getTime() < from.getTime());
      if (baseline.length > 0) currentState = safeState(baseline[baseline.length - 1].state);

      const inRange = events.filter((e) => {
        const t = new Date(e.occurredAt).getTime();
        return t >= from.getTime() && t <= to.getTime();
      });

      let cursor = from;
      const seconds = { online: 0, offline: 0 };
      let onlineCount = 0;
      let offlineCount = 0;

      const addSeconds = (fromT: Date, toT: Date, state: UserPresenceState) => {
        const value = Math.max(0, Math.floor((toT.getTime() - fromT.getTime()) / 1000));
        seconds[state] += value;
      };

      for (const ev of inRange) {
        const occurredAt = new Date(ev.occurredAt);
        addSeconds(cursor, occurredAt, currentState);
        currentState = safeState(ev.state);
        cursor = occurredAt;

        if (currentState === 'online') onlineCount += 1;
        if (currentState === 'offline') offlineCount += 1;
      }

      addSeconds(cursor, to, currentState);

      return {
        userId,
        name: [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.email,
        email: user.email,
        phone: user.phone,
        roleId: user.roleId,
        currentState: status?.state || 'offline',
        lastChangedAt: status?.lastChangedAt || null,
        lastSeenAt: status?.lastSeenAt || null,
        source: status?.source || 'system',
        onlineCount,
        offlineCount,
        seconds,
      };
    });

    const totals = items.reduce(
      (acc, item) => {
        if (item.currentState === 'online') acc.onlineNow += 1;
        if (item.currentState === 'offline') acc.offlineNow += 1;
        acc.onlineSeconds += item.seconds.online;
        acc.offlineSeconds += item.seconds.offline;
        acc.onlineCount += item.onlineCount;
        acc.offlineCount += item.offlineCount;
        return acc;
      },
      { users: items.length, onlineNow: 0, offlineNow: 0, onlineSeconds: 0, offlineSeconds: 0, onlineCount: 0, offlineCount: 0 },
    );

    items.sort((a, b) => {
      if (a.currentState !== b.currentState) return a.currentState === 'online' ? -1 : 1;
      return b.seconds.online - a.seconds.online;
    });

    return { rangeDays, from, to, totals, items };
  }

  async getEvents(params?: { from?: string; to?: string; rangeDays?: number; userId?: number }) {
    const { from, to, rangeDays } = this.getRange(params);
    const explicitUserId = params?.userId != null ? Number(params.userId) : null;
    const qb = this.eventRepo
      .createQueryBuilder('e')
      .where('e.occurredAt >= :from AND e.occurredAt <= :to', { from, to });

    if (explicitUserId != null) qb.andWhere('e.userId = :userId', { userId: explicitUserId });

    const events = await qb.orderBy('e.occurredAt', 'ASC').take(1000).getMany();
    const baselineRows =
      explicitUserId != null
        ? await this.eventRepo.query(
            `SELECT id, user_id as "userId", state, source, occurred_at as "occurredAt", created_at as "createdAt"
             FROM user_presence_events
             WHERE user_id = $1 AND occurred_at < $2
             ORDER BY occurred_at DESC
             LIMIT 1`,
            [explicitUserId, from],
          )
        : [];
    const userIds = Array.from(new Set([...events.map((e) => Number(e.userId)), ...(explicitUserId != null ? [explicitUserId] : [])]));
    const users = userIds.length ? await this.userRepo.find({ where: { id: In(userIds) } as any }) : [];
    const userById = new Map(users.map((u) => [Number(u.id), u]));
    const eventsByUser = new Map<number, UserPresenceEvent[]>();

    for (const event of [...(baselineRows || []), ...events]) {
      const list = eventsByUser.get(Number(event.userId)) || [];
      list.push(event);
      eventsByUser.set(Number(event.userId), list);
    }

    const items: any[] = [];
    for (const [userId, userEvents] of eventsByUser.entries()) {
      const ordered = userEvents.slice().sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
      const user = userById.get(userId);

      ordered.forEach((event, idx) => {
        const occurredAt = new Date(event.occurredAt);
        const startedAt = occurredAt < from ? from : occurredAt;
        const endedAt = idx < ordered.length - 1 ? new Date(ordered[idx + 1].occurredAt) : to;
        const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
        const isCurrentPeriod = idx === ordered.length - 1;

        items.push({
          id: event.id,
          userId: event.userId,
          name: user ? [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.email : `User #${event.userId}`,
          email: user?.email || null,
          state: event.state,
          source: event.source,
          occurredAt: event.occurredAt,
          startedAt,
          endedAt,
          durationSeconds,
          isCurrentPeriod,
        });
      });
    }

    items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return {
      rangeDays,
      from,
      to,
      items,
    };
  }

  async getCalendar(params?: { sheetName?: string }) {
    const settings = await this.getSettings();
    const timezone = settings.timezone || 'Asia/Dhaka';
    const sheetName = String(params?.sheetName || settings.summarySheetName || this.getDefaultMonthSheetName()).trim();
    const { year, monthIndex, days } = this.getDaysInSheetMonth(sheetName, timezone);
    const todayKey = this.getDhakaDateKey(new Date(), timezone);
    const monthStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 2, 23, 59, 59));

    const users = await this.userRepo.find({
      where: { isDeleted: false, status: 'active' } as any,
      order: { name: 'ASC', lastName: 'ASC' } as any,
    });
    const userIds = users.map((u) => Number(u.id));
    const events = userIds.length
      ? await this.eventRepo
          .createQueryBuilder('e')
          .where('e.userId IN (:...userIds)', { userIds })
          .andWhere('e.occurredAt >= :from AND e.occurredAt <= :to', { from: monthStart, to: monthEnd })
          .orderBy('e.occurredAt', 'ASC')
          .getMany()
      : [];

    const eventsByUserDay = new Map<string, UserPresenceEvent[]>();
    for (const event of events) {
      if (event.state !== 'online') continue;
      const dayKey = this.getDhakaDateKey(new Date(event.occurredAt), timezone);
      const key = `${event.userId}:${dayKey}`;
      const list = eventsByUserDay.get(key) || [];
      list.push(event);
      eventsByUserDay.set(key, list);
    }

    const officeTimeRows = userIds.length ? await this.officeTimeRepo.find({ where: { userId: In(userIds) } as any }) : [];
    const officeTimeByUser = new Map(officeTimeRows.map((row) => [Number(row.userId), row]));
    const overrides = userIds.length
      ? await this.calendarOverrideRepo
          .createQueryBuilder('o')
          .where('o.userId IN (:...userIds)', { userIds })
          .andWhere('o.dateKey >= :from AND o.dateKey <= :to', {
            from: this.dateKeyForMonthDay(year, monthIndex, 1),
            to: this.dateKeyForMonthDay(year, monthIndex, days),
          })
          .getMany()
      : [];
    const overrideByUserDay = new Map(overrides.map((row) => [`${row.userId}:${row.dateKey}`, row]));

    const order = Array.isArray(settings.calendarUserOrder) ? settings.calendarUserOrder.map((x) => Number(x)) : [];
    const orderIndex = new Map(order.map((userId, idx) => [userId, idx]));
    const orderedUsers = users.slice().sort((a, b) => {
      const ai = orderIndex.has(Number(a.id)) ? orderIndex.get(Number(a.id))! : Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.has(Number(b.id)) ? orderIndex.get(Number(b.id))! : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return String(`${a.name || ''} ${a.lastName || ''}`).localeCompare(String(`${b.name || ''} ${b.lastName || ''}`));
    });

    const keyConfig = {
      present: { key: settings.attendancePresentKey || 'P', label: settings.attendancePresentLabel || 'Present', color: settings.attendancePresentColor || '#16a34a' },
      late: { key: settings.attendanceLateKey || 'L', label: settings.attendanceLateLabel || 'Late', color: settings.attendanceLateColor || '#f59e0b' },
      weeklyOff: { key: settings.attendanceWeeklyOffKey || 'W', label: settings.attendanceWeeklyOffLabel || 'Weekly off day', color: settings.attendanceWeeklyOffColor || '#64748b' },
      excusedAbsence: { key: settings.attendanceExcusedAbsenceKey || 'U', label: settings.attendanceExcusedAbsenceLabel || 'Excused absence', color: settings.attendanceExcusedAbsenceColor || '#2563eb' },
      unexcusedAbsence: {
        key: settings.attendanceUnexcusedAbsenceKey || 'A',
        label: settings.attendanceUnexcusedAbsenceLabel || 'Unexcused absence',
        color: settings.attendanceUnexcusedAbsenceColor || '#dc2626',
      },
    };

    const daysList = Array.from({ length: days }, (_, idx) => {
      const day = idx + 1;
      return {
        day,
        key: this.dateKeyForMonthDay(year, monthIndex, day),
        label: `${day}/${monthIndex + 1}`,
        weekday: new Date(year, monthIndex, day).toLocaleDateString('en-US', { weekday: 'short' }),
      };
    });

    const rows = orderedUsers.map((user, idx) => {
      const userId = Number(user.id);
      const officeTime = officeTimeByUser.get(userId);
      const userOfficeStart = officeTime?.officeStartTime || settings.officeStartTime;
      const userOfficeStartMinutes = this.timeToMinutes(userOfficeStart);
      return {
        userId,
        name: [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.email,
        email: user.email,
        officeStartTime: userOfficeStart,
        insertGapAfter: settings.calendarTeamGapEvery > 0 && (idx + 1) % settings.calendarTeamGapEvery === 0 && idx < orderedUsers.length - 1,
        cells: daysList.map((day) => {
          const override = overrideByUserDay.get(`${userId}:${day.key}`);
          if (override) {
            const matched = Object.values(keyConfig).find((config) => config.key === override.attendanceKey);
            return {
              dateKey: day.key,
              value: override.attendanceKey,
              label: override.attendanceLabel || matched?.label || 'Manual override',
              color: matched?.color || '#111827',
              isManual: true,
              note: override.note || '',
            };
          }

          if (day.key > todayKey) return { dateKey: day.key, value: '', label: '', color: '' };
          const onlineEvents = (eventsByUserDay.get(`${userId}:${day.key}`) || []).sort(
            (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
          );
          if (onlineEvents.length === 0) {
            return { dateKey: day.key, value: keyConfig.unexcusedAbsence.key, label: keyConfig.unexcusedAbsence.label, color: keyConfig.unexcusedAbsence.color };
          }

          const firstOnline = new Date(onlineEvents[0].occurredAt);
          const firstMinutes =
            Number(firstOnline.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: timezone })) * 60 +
            Number(firstOnline.toLocaleString('en-US', { minute: '2-digit', timeZone: timezone }));
          const config = firstMinutes > userOfficeStartMinutes ? keyConfig.late : keyConfig.present;
          return { dateKey: day.key, value: config.key, label: config.label, color: config.color };
        }),
      };
    });

    return {
      sheetName,
      year,
      month: monthIndex + 1,
      timezone,
      days: daysList,
      keyConfig,
      rowGap: {
        every: settings.calendarTeamGapEvery || 0,
        size: settings.calendarTeamGapSize || 12,
      },
      rows,
    };
  }

  async updateCalendarOrder(userIds: any[]) {
    const settings = await this.getSettings();
    const next = Array.isArray(userIds)
      ? Array.from(new Set(userIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)))
      : [];
    settings.calendarUserOrder = next;
    return this.settingsRepo.save(settings);
  }

  async getOfficeTimes() {
    const users = await this.userRepo.find({
      where: { isDeleted: false, status: 'active' } as any,
      order: { name: 'ASC', lastName: 'ASC' } as any,
    });
    const rows = await this.officeTimeRepo.find();
    const byUserId = new Map(rows.map((row) => [Number(row.userId), row]));
    const settings = await this.getSettings();

    return {
      defaultOfficeStartTime: settings.officeStartTime,
      defaultOfficeEndTime: settings.officeEndTime,
      items: users.map((user) => {
        const row = byUserId.get(Number(user.id));
        return {
          userId: Number(user.id),
          name: [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.email,
          email: user.email,
          officeStartTime: row?.officeStartTime || settings.officeStartTime,
          officeEndTime: row?.officeEndTime || settings.officeEndTime,
          customOfficeStartTime: row?.officeStartTime || '',
          customOfficeEndTime: row?.officeEndTime || '',
          telegramChatId: row?.telegramChatId || '',
          notes: row?.notes || '',
        };
      }),
    };
  }

  async updateOfficeTime(
    userIdRaw: any,
    input: { officeStartTime?: string | null; officeEndTime?: string | null; telegramChatId?: string | null; notes?: string | null },
  ) {
    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId) || userId <= 0) throw new BadRequestException('Valid user ID is required');

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const officeStartTime = String(input.officeStartTime || '').trim();
    const officeEndTime = String(input.officeEndTime || '').trim();
    if (officeStartTime && !timePattern.test(officeStartTime)) throw new BadRequestException('Office start time must be HH:mm');
    if (officeEndTime && !timePattern.test(officeEndTime)) throw new BadRequestException('Office end time must be HH:mm');

    let row = await this.officeTimeRepo.findOne({ where: { userId } });
    if (!row) row = this.officeTimeRepo.create({ userId });
    row.officeStartTime = officeStartTime || null;
    row.officeEndTime = officeEndTime || null;
    row.telegramChatId = String(input.telegramChatId || '').trim().slice(0, 80) || null;
    row.notes = String(input.notes || '').trim() || null;
    return this.officeTimeRepo.save(row);
  }

  async updateCalendarOverride(input: { userId?: number; dateKey?: string; attendanceKey?: string; note?: string | null }, updatedBy?: number) {
    const userId = Number(input.userId);
    const dateKey = String(input.dateKey || '').trim();
    const attendanceKey = String(input.attendanceKey || '').trim().slice(0, 10);
    if (!Number.isFinite(userId) || userId <= 0) throw new BadRequestException('Valid user ID is required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new BadRequestException('Date key must be YYYY-MM-DD');

    const settings = await this.getSettings();
    const configByKey = new Map([
      [settings.attendancePresentKey || 'P', settings.attendancePresentLabel || 'Present'],
      [settings.attendanceLateKey || 'L', settings.attendanceLateLabel || 'Late'],
      [settings.attendanceWeeklyOffKey || 'W', settings.attendanceWeeklyOffLabel || 'Weekly off day'],
      [settings.attendanceExcusedAbsenceKey || 'U', settings.attendanceExcusedAbsenceLabel || 'Excused absence'],
      [settings.attendanceUnexcusedAbsenceKey || 'A', settings.attendanceUnexcusedAbsenceLabel || 'Unexcused absence'],
    ]);

    const existing = await this.calendarOverrideRepo.findOne({ where: { userId, dateKey } });
    if (!attendanceKey) {
      if (existing) await this.calendarOverrideRepo.remove(existing);
      return { deleted: true };
    }
    if (!configByKey.has(attendanceKey)) throw new BadRequestException('Attendance key is not configured');

    const row = existing || this.calendarOverrideRepo.create({ userId, dateKey });
    row.attendanceKey = attendanceKey;
    row.attendanceLabel = configByKey.get(attendanceKey) || null;
    row.note = String(input.note || '').trim() || null;
    row.updatedBy = updatedBy || null;
    return this.calendarOverrideRepo.save(row);
  }

  private async getGoogleAccessToken() {
    let serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const serviceAccountFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!serviceAccountJson && serviceAccountFile) {
      serviceAccountJson = fs.readFileSync(serviceAccountFile, 'utf8');
    }

    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      clientEmail = parsed.client_email;
      privateKey = parsed.private_key;
    }

    privateKey = privateKey?.replace(/\\n/g, '\n');
    if (!clientEmail || !privateKey) {
      throw new BadRequestException('Google service account credentials are missing');
    }

    const now = Math.floor(Date.now() / 1000);
    const assertion = jwt.sign(
      {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      },
      privateKey,
      { algorithm: 'RS256' },
    );

    const res = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return res.data?.access_token as string;
  }

  private async ensureSheets(spreadsheetId: string, accessToken: string, sheetNames: string[]) {
    const meta = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const existing = new Set((meta.data?.sheets || []).map((s: any) => String(s.properties?.title || '')));
    const requests = sheetNames
      .filter((title) => title && !existing.has(title))
      .map((title) => ({ addSheet: { properties: { title } } }));

    if (requests.length === 0) return;

    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      { requests },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  }

  private async replaceSheetValues(spreadsheetId: string, accessToken: string, sheetName: string, values: any[][]) {
    const encodedRange = encodeURIComponent(`'${sheetName}'!A:Z`);
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:clear`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const updateRange = encodeURIComponent(`'${sheetName}'!A1`);
    await axios.put(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
      { values },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  }

  private getDefaultMonthSheetName(date = new Date()) {
    return date.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Dhaka' }) + '-' + String(date.getFullYear()).slice(-2);
  }

  private getDaysInSheetMonth(sheetName: string, timezone: string) {
    const now = new Date();
    const match = String(sheetName || '').match(/^([A-Za-z]{3})-(\d{2})$/);
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = match ? monthNames.indexOf(match[1].toLowerCase()) : Number(now.toLocaleString('en-US', { month: 'numeric', timeZone: timezone })) - 1;
    const year = match ? 2000 + Number(match[2]) : Number(now.toLocaleString('en-US', { year: 'numeric', timeZone: timezone }));
    const days = new Date(year, monthIndex + 1, 0).getDate();
    return { year, monthIndex, days };
  }

  private getDhakaDateKey(date: Date, timezone: string) {
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
  }

  private dateKeyForMonthDay(year: number, monthIndex: number, day: number) {
    const month = String(monthIndex + 1).padStart(2, '0');
    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  }

  private timeToMinutes(value: string) {
    const [h, m] = String(value || '09:00').split(':').map((x) => Number(x));
    return (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
  }

  private buildAttendanceGrid(settings: PresenceSettings, dashboard: any, events: any) {
    const timezone = settings.timezone || 'Asia/Dhaka';
    const sheetName = settings.summarySheetName || this.getDefaultMonthSheetName();
    const { year, monthIndex, days } = this.getDaysInSheetMonth(sheetName, timezone);
    const todayKey = this.getDhakaDateKey(new Date(), timezone);
    const officeStartMinutes = this.timeToMinutes(settings.officeStartTime);
    const eventsByUserDay = new Map<string, any[]>();

    for (const event of events.items || []) {
      if (event.state !== 'online') continue;
      const occurredAt = new Date(event.occurredAt);
      const dayKey = this.getDhakaDateKey(occurredAt, timezone);
      const key = `${event.userId}:${dayKey}`;
      const list = eventsByUserDay.get(key) || [];
      list.push(event);
      eventsByUserDay.set(key, list);
    }

    const rows: any[][] = [
      [
        '',
        "\n  Enter P for Present, L for Late, W for Weekly off day, and U for Excused absence. Use the 'Attendance key' tab to customise. \n",
      ],
      ['Date', ...Array.from({ length: days }, (_, idx) => `${idx + 1}/${monthIndex + 1}`)],
      [
        'Office Shift',
        ...Array.from({ length: days }, (_, idx) =>
          new Date(year, monthIndex, idx + 1).toLocaleDateString('en-US', { weekday: 'short' }),
        ),
      ],
    ];

    for (const user of dashboard.items || []) {
      const row = [user.name || `User #${user.userId}`];
      for (let day = 1; day <= days; day += 1) {
        const dayKey = this.dateKeyForMonthDay(year, monthIndex, day);
        if (dayKey > todayKey) {
          row.push('');
          continue;
        }

        const onlineEvents = (eventsByUserDay.get(`${user.userId}:${dayKey}`) || []).sort(
          (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
        );

        if (onlineEvents.length === 0) {
          row.push(settings.attendanceUnexcusedAbsenceKey || 'A');
          continue;
        }

        const firstOnline = new Date(onlineEvents[0].occurredAt);
        const firstMinutes =
          Number(firstOnline.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: timezone })) * 60 +
          Number(firstOnline.toLocaleString('en-US', { minute: '2-digit', timeZone: timezone }));

        row.push(firstMinutes > officeStartMinutes ? settings.attendanceLateKey || 'L' : settings.attendancePresentKey || 'P');
      }
      rows.push(row);
    }

    return rows;
  }

  async syncGoogleSheet() {
    const settings = await this.getSettings();
    const spreadsheetId = settings.googleSpreadsheetId || settings.attendanceKey;
    if (!spreadsheetId) throw new BadRequestException('Google Spreadsheet ID or attendance key is required');

    const dashboard = await this.getDashboard({ rangeDays: 30 });
    const events = await this.getEvents({ rangeDays: 30 });
    const accessToken = await this.getGoogleAccessToken();
    const sheetNames = [settings.summarySheetName, settings.settingsSheetName, settings.eventsSheetName].filter(Boolean);

    try {
      await this.ensureSheets(spreadsheetId, accessToken, sheetNames);

      await this.replaceSheetValues(spreadsheetId, accessToken, settings.settingsSheetName, [
        ['', 'SETTINGS'],
        ['', 'ATTENDANCE KEY'],
        ['', 'Change the attendance key by updating the values below.'],
        ['', "Add classes by duplicating the monthly sheet tab. New tabs will reference this same attendance key."],
        [],
        ['', 'ATTENDANCE KEY'],
        ['', settings.attendancePresentKey || 'P', settings.attendancePresentLabel || 'Present'],
        ['', settings.attendanceLateKey || 'L', settings.attendanceLateLabel || 'Late'],
        ['', settings.attendanceWeeklyOffKey || 'W', settings.attendanceWeeklyOffLabel || 'Weekly off day'],
        ['', settings.attendanceExcusedAbsenceKey || 'U', settings.attendanceExcusedAbsenceLabel || 'Excused absence'],
        ['', settings.attendanceUnexcusedAbsenceKey || 'A', settings.attendanceUnexcusedAbsenceLabel || 'Unexcused absence'],
        [],
        ['', 'OFFICE SETTINGS'],
        ['', 'Office Start Time', settings.officeStartTime],
        ['', 'Office End Time', settings.officeEndTime],
        ['', 'Timezone', settings.timezone],
        ['', 'Attendance Key', settings.attendanceKey || ''],
        ['', 'Spreadsheet ID', spreadsheetId],
        ['', 'Last Synced At', new Date().toISOString()],
      ]);

      await this.replaceSheetValues(spreadsheetId, accessToken, settings.summarySheetName, this.buildAttendanceGrid(settings, dashboard, events));

      if (settings.eventsSheetName) {
        await this.replaceSheetValues(spreadsheetId, accessToken, settings.eventsSheetName, [
          ['Date', 'Time', 'User ID', 'Name', 'Email', 'Status', 'Source'],
          ...events.items
            .slice()
            .reverse()
            .map((event) => {
              const occurredAt = new Date(event.occurredAt);
              return [
                occurredAt.toLocaleDateString('en-CA', { timeZone: settings.timezone }),
                occurredAt.toLocaleTimeString('en-GB', { timeZone: settings.timezone, hour12: false }),
                event.userId,
                event.name,
                event.email || '',
                event.state,
                event.source,
              ];
            }),
        ]);
      }

      settings.lastSyncedAt = new Date();
      settings.lastSyncStatus = 'success';
      settings.lastSyncMessage = `Synced ${dashboard.items.length} users and ${events.items.length} events`;
      await this.settingsRepo.save(settings);

      return {
        status: 'success',
        spreadsheetId,
        syncedAt: settings.lastSyncedAt,
        users: dashboard.items.length,
        events: events.items.length,
      };
    } catch (err: any) {
      settings.lastSyncedAt = new Date();
      settings.lastSyncStatus = 'failed';
      settings.lastSyncMessage = err?.response?.data?.error?.message || err?.message || 'Google Sheets sync failed';
      await this.settingsRepo.save(settings);
      throw err;
    }
  }
}
