import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isIP } from 'net';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';
import { User } from '../users/user.entity';
import { UserPresenceEvent } from './entities/user-presence-event.entity';
import { UserPresenceState, UserPresenceStatus } from './entities/user-presence-status.entity';
import { PresenceSettings } from './entities/presence-settings.entity';
import { UserOfficeTime } from './entities/user-office-time.entity';
import { PresenceCalendarOverride } from './entities/presence-calendar-override.entity';
import { PresenceCalendarOverrideHistory } from './entities/presence-calendar-override-history.entity';
import { PresenceUserProfile, PresenceUserStatus } from './entities/presence-user-profile.entity';
import { BackupTeamOfficeTime } from './entities/backup-team-office-time.entity';
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

function normalizeIpAddress(value: any): string {
  let next = String(value || '').trim();
  if (!next) return '';
  if (next.startsWith('::ffff:')) next = next.slice(7);
  const bracketMatch = next.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketMatch) next = bracketMatch[1];
  const ipv4PortMatch = next.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4PortMatch) next = ipv4PortMatch[1];
  return next.toLowerCase();
}

function parseAllowedCheckInIps(value: any): string[] {
  return String(value || '')
    .split(/[\s,;]+/)
    .map(normalizeIpAddress)
    .filter(Boolean);
}

function cleanAllowedCheckInIps(value: any): string | null {
  const ips = Array.from(new Set(parseAllowedCheckInIps(value)));
  const invalid = ips.filter((ip) => isIP(ip) === 0);
  if (invalid.length > 0) {
    throw new BadRequestException(`Invalid check-in IP address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}`);
  }
  return ips.join('\n') || null;
}

function isMissingRelationError(error: any): boolean {
  return error?.code === '42P01' || String(error?.message || '').includes('relation "presence_user_profiles" does not exist') || String(error?.message || '').includes('relation "backup_team_office_times" does not exist');
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
    @InjectRepository(PresenceCalendarOverrideHistory)
    private readonly calendarOverrideHistoryRepo: Repository<PresenceCalendarOverrideHistory>,
    @InjectRepository(PresenceUserProfile)
    private readonly presenceUserProfileRepo: Repository<PresenceUserProfile>,
    @InjectRepository(BackupTeamOfficeTime)
    private readonly backupTeamOfficeTimeRepo: Repository<BackupTeamOfficeTime>,
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

  private cleanPresenceUserStatus(value: any): PresenceUserStatus {
    const next = String(value || '').trim().toLowerCase();
    if (next === 'inactive' || next === 'backup') return next;
    return 'active';
  }

  private async getPresenceProfilesForUsers(userIds: number[]) {
    const ids = Array.from(new Set(userIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
    if (ids.length === 0) return new Map<number, PresenceUserProfile>();
    try {
      const rows = await this.presenceUserProfileRepo.find({ where: { userId: In(ids) } as any });
      return new Map(rows.map((row) => [Number(row.userId), row]));
    } catch (error: any) {
      if (isMissingRelationError(error)) return new Map<number, PresenceUserProfile>();
      throw error;
    }
  }

  private async filterUsersByPresenceStatus(users: User[], allowedStatuses: PresenceUserStatus[]) {
    const allowed = new Set(allowedStatuses);
    const profiles = await this.getPresenceProfilesForUsers(users.map((user) => Number(user.id)));
    return users.filter((user) => {
      const profileStatus = profiles.get(Number(user.id))?.status || 'active';
      return allowed.has(this.cleanPresenceUserStatus(profileStatus));
    });
  }

  private async getPresenceVisibleUsers(allowedStatuses: PresenceUserStatus[] = ['active', 'backup']) {
    const users = await this.userRepo.find({
      where: { isDeleted: false, status: 'active' } as any,
      order: { name: 'ASC', lastName: 'ASC' } as any,
    });
    return this.filterUsersByPresenceStatus(users, allowedStatuses);
  }

  private async getPresenceStatusForUser(userId: number): Promise<PresenceUserStatus> {
    try {
      const profile = await this.presenceUserProfileRepo.findOne({ where: { userId } });
      return this.cleanPresenceUserStatus(profile?.status);
    } catch (error: any) {
      if (isMissingRelationError(error)) return 'active';
      throw error;
    }
  }

  private validateTimeValue(value: string, label: string, required = false) {
    const next = String(value || '').trim();
    if (!next && !required) return '';
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(next)) throw new BadRequestException(`${label} must be HH:mm`);
    return next;
  }

  private chooseBackupRuleForMinutes(rules: BackupTeamOfficeTime[] | undefined, firstMinutes: number | null) {
    const validRules = (rules || []).filter((rule) => rule.officeStartTime && rule.officeEndTime);
    if (validRules.length === 0) return null;
    if (firstMinutes == null) return validRules[0];
    return validRules
      .slice()
      .sort((a, b) => Math.abs(this.timeToMinutes(a.officeStartTime) - firstMinutes) - Math.abs(this.timeToMinutes(b.officeStartTime) - firstMinutes))[0];
  }

  private async getBackupRulesByUserIds(userIds: number[]) {
    const ids = Array.from(new Set(userIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
    if (ids.length === 0) return new Map<number, BackupTeamOfficeTime[]>();
    let rows: BackupTeamOfficeTime[] = [];
    try {
      rows = await this.backupTeamOfficeTimeRepo.find({
        where: { userId: In(ids) } as any,
        order: { userId: 'ASC', sortOrder: 'ASC', id: 'ASC' } as any,
      });
    } catch (error: any) {
      if (isMissingRelationError(error)) return new Map<number, BackupTeamOfficeTime[]>();
      throw error;
    }
    const byUserId = new Map<number, BackupTeamOfficeTime[]>();
    for (const row of rows) {
      const list = byUserId.get(Number(row.userId)) || [];
      list.push(row);
      byUserId.set(Number(row.userId), list);
    }
    return byUserId;
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
    return this.getOrCreateStatus(Number(userId));
  }

  async setMyStatus(userId: number, stateRaw: any, source = 'manual') {
    const userIdNum = Number(userId);
    if (!Number.isFinite(userIdNum) || userIdNum <= 0) throw new BadRequestException('Invalid user ID');
    const presenceStatus = await this.getPresenceStatusForUser(userIdNum);
    if (presenceStatus === 'inactive') throw new ForbiddenException('Your Presence status is inactive.');
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
      allowedCheckInIps: null,
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
    settings.allowedCheckInIps = cleanAllowedCheckInIps((input as any).allowedCheckInIps ?? settings.allowedCheckInIps ?? '');
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
    settings.googleSpreadsheetId =
      input.googleSpreadsheetId == null ? settings.googleSpreadsheetId : String(input.googleSpreadsheetId || '').trim() || null;
    settings.summarySheetName = String(input.summarySheetName ?? settings.summarySheetName ?? this.getDefaultMonthSheetName()).trim() || this.getDefaultMonthSheetName();
    settings.eventsSheetName = String(input.eventsSheetName ?? settings.eventsSheetName ?? '').trim();
    settings.settingsSheetName = String(input.settingsSheetName ?? settings.settingsSheetName ?? 'Attendance key').trim() || 'Attendance key';

    return this.settingsRepo.save(settings);
  }

  async assertCheckInIpAllowed(clientIpRaw: any) {
    const settings = await this.getSettings();
    const allowedIps = parseAllowedCheckInIps(settings.allowedCheckInIps);
    if (allowedIps.length === 0) return;

    const clientIp = normalizeIpAddress(clientIpRaw);
    if (clientIp && allowedIps.includes(clientIp)) return;

    throw new ForbiddenException('Check in is allowed only from permitted office IP addresses.');
  }

  async getDashboard(params?: { from?: string; to?: string; rangeDays?: number; userId?: number }) {
    const { from, to, rangeDays } = this.getRange(params);
    const users = await this.getPresenceVisibleUsers(['active', 'backup']);

    const allowedUsers = params?.userId
      ? users.filter((u) => Number(u.id) === Number(params.userId))
      : users;
    const userIds = allowedUsers.map((u) => Number(u.id));

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
    const visibleUsers = await this.getPresenceVisibleUsers(['active', 'backup']);
    const visibleUserIds = visibleUsers.map((user) => Number(user.id));
    if (explicitUserId != null && !visibleUserIds.includes(explicitUserId)) {
      return { rangeDays, from, to, items: [] };
    }
    const qb = this.eventRepo
      .createQueryBuilder('e')
      .where('e.occurredAt >= :from AND e.occurredAt <= :to', { from, to });

    if (explicitUserId != null) qb.andWhere('e.userId = :userId', { userId: explicitUserId });
    else if (visibleUserIds.length > 0) qb.andWhere('e.userId IN (:...visibleUserIds)', { visibleUserIds });
    else return { rangeDays, from, to, items: [] };

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

  async getStatisticsUsers() {
    let rows: any[] = [];
    try {
      rows = await this.userRepo.manager.query(
        `SELECT
           u.id,
           NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))), '') AS name,
           u.email,
           u.phone,
           u.created_at,
           u.team_leader_id,
           COALESCE(pup.status, 'active') AS presence_status,
           NULLIF(TRIM(CONCAT(COALESCE(tl.name, ''), ' ', COALESCE(tl.last_name, ''))), '') AS team_leader_name,
           r.name AS role_name,
           r.slug AS role_slug,
           r.priority AS role_priority
         FROM users u
         LEFT JOIN users tl ON tl.id = u.team_leader_id
         LEFT JOIN roles r ON r.id = u.role_id
         LEFT JOIN presence_user_profiles pup ON pup.user_id = u.id
         WHERE COALESCE(u.is_deleted, false) = false
           AND COALESCE(u.status, 'active') = 'active'
           AND COALESCE(pup.status, 'active') IN ('active', 'backup')
         ORDER BY COALESCE(r.priority, 0) DESC, team_leader_name NULLS LAST, name ASC, u.email ASC`,
      );
    } catch (error: any) {
      if (!isMissingRelationError(error)) throw error;
      rows = await this.userRepo.manager.query(
        `SELECT
           u.id,
           NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))), '') AS name,
           u.email,
           u.phone,
           u.created_at,
           u.team_leader_id,
           'active' AS presence_status,
           NULLIF(TRIM(CONCAT(COALESCE(tl.name, ''), ' ', COALESCE(tl.last_name, ''))), '') AS team_leader_name,
           r.name AS role_name,
           r.slug AS role_slug,
           r.priority AS role_priority
         FROM users u
         LEFT JOIN users tl ON tl.id = u.team_leader_id
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE COALESCE(u.is_deleted, false) = false
           AND COALESCE(u.status, 'active') = 'active'
         ORDER BY COALESCE(r.priority, 0) DESC, team_leader_name NULLS LAST, name ASC, u.email ASC`,
      );
    }

    return (rows || []).map((row: any) => ({
      id: Number(row.id),
      name: row.name || row.email || `User #${row.id}`,
      email: row.email || null,
      phone: row.phone || null,
      createdAt: row.created_at || null,
      presenceStatus: this.cleanPresenceUserStatus(row.presence_status),
      teamLeaderId: row.team_leader_id == null ? null : Number(row.team_leader_id),
      teamLeaderName: row.team_leader_name || null,
      roleName: row.role_name || null,
      roleSlug: row.role_slug || null,
      rolePriority: Number(row.role_priority || 0),
    }));
  }

  private dateFromDhakaKey(dateKey: string, endOfDay = false) {
    return new Date(`${dateKey}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+06:00`);
  }

  private secondsToHours(value: number) {
    return Math.round((Number(value || 0) / 3600) * 100) / 100;
  }

  private minutesToTimeLabel(minutes: number | null) {
    if (minutes == null || !Number.isFinite(minutes)) return '-';
    const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
    return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
  }

  private weekKeyForDateKey(dateKey: string, timezone: string) {
    const noon = new Date(`${dateKey}T12:00:00+06:00`);
    const weekday = noon.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone });
    const weekdayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(weekday);
    const offset = weekdayIndex < 0 ? 0 : weekdayIndex;
    const monday = new Date(noon.getTime() - offset * 24 * 3600 * 1000);
    return this.getDhakaDateKey(monday, timezone);
  }

  private makeEmptyPresenceBucket(label: string, extra: Record<string, any> = {}) {
    return {
      label,
      days: 0,
      countedDays: 0,
      present: 0,
      late: 0,
      weeklyOff: 0,
      excusedLeave: 0,
      unwantedLeave: 0,
      manualOverrides: 0,
      checkIns: 0,
      checkOuts: 0,
      totalOnlineSeconds: 0,
      avgDailySeconds: 0,
      avgPresentDaySeconds: 0,
      avgCheckInMinutes: null as number | null,
      avgCheckInTime: '-',
      ...extra,
    };
  }

  private finalizePresenceBucket(bucket: any) {
    bucket.avgDailySeconds = bucket.countedDays > 0 ? Math.round(bucket.totalOnlineSeconds / bucket.countedDays) : 0;
    const attendedDays = bucket.present + bucket.late;
    bucket.avgPresentDaySeconds = attendedDays > 0 ? Math.round(bucket.totalOnlineSeconds / attendedDays) : 0;
    bucket.avgCheckInTime = this.minutesToTimeLabel(bucket.avgCheckInMinutes);
    bucket.totalOnlineHours = this.secondsToHours(bucket.totalOnlineSeconds);
    bucket.avgDailyHours = this.secondsToHours(bucket.avgDailySeconds);
    bucket.avgPresentDayHours = this.secondsToHours(bucket.avgPresentDaySeconds);
    bucket.attendanceRate = bucket.countedDays > 0 ? Math.round(((bucket.present + bucket.late) / bucket.countedDays) * 10000) / 100 : 0;
    bucket.lateRate = (bucket.present + bucket.late) > 0 ? Math.round((bucket.late / (bucket.present + bucket.late)) * 10000) / 100 : 0;
    bucket.unwantedLeaveRate = bucket.countedDays > 0 ? Math.round((bucket.unwantedLeave / bucket.countedDays) * 10000) / 100 : 0;
    return bucket;
  }

  async getPresenceStatistics(params: { userId?: number; year?: number }) {
    const userId = Number(params.userId);
    if (!Number.isFinite(userId) || userId <= 0) throw new BadRequestException('Employee is required');
    const year = clampInt(params.year, 2000, 2100, new Date().getFullYear());
    const settings = await this.getSettings();
    const timezone = settings.timezone || 'Asia/Dhaka';

    const userRows = await this.getStatisticsUsers();
    const employee = userRows.find((row: any) => Number(row.id) === userId);
    if (!employee) throw new BadRequestException('Employee not found');

    const officeTime = await this.officeTimeRepo.findOne({ where: { userId } as any });
    const backupRules = employee.presenceStatus === 'backup' ? (await this.getBackupRulesByUserIds([userId])).get(userId) || [] : [];
    const firstBackupRule = backupRules[0] || null;
    const officeStart = firstBackupRule?.officeStartTime || officeTime?.officeStartTime || settings.officeStartTime || '09:00';
    const officeEnd = firstBackupRule?.officeEndTime || officeTime?.officeEndTime || settings.officeEndTime || '18:00';
    const officeStartMinutes = this.timeToMinutes(officeStart);
    const cautionMinutes = Math.max(0, Math.min(240, Number(firstBackupRule?.cautionMinutes ?? officeTime?.cautionMinutes ?? 0)));

    const yearStartKey = `${year}-01-01`;
    const yearEndKey = `${year}-12-31`;
    const yearStart = this.dateFromDhakaKey(yearStartKey);
    const yearEnd = this.dateFromDhakaKey(yearEndKey, true);
    const now = new Date();
    const todayKey = this.getDhakaDateKey(now, timezone);
    const employeeStartKey = employee.createdAt ? this.getDhakaDateKey(new Date(employee.createdAt), timezone) : yearStartKey;

    const [events, baselineRows, overrides] = await Promise.all([
      this.eventRepo
        .createQueryBuilder('e')
        .where('e.userId = :userId', { userId })
        .andWhere('e.occurredAt >= :from AND e.occurredAt <= :to', { from: yearStart, to: yearEnd })
        .orderBy('e.occurredAt', 'ASC')
        .getMany(),
      this.eventRepo.query(
        `SELECT id, user_id as "userId", state, source, occurred_at as "occurredAt", created_at as "createdAt"
         FROM user_presence_events
         WHERE user_id = $1 AND occurred_at < $2
         ORDER BY occurred_at DESC
         LIMIT 1`,
        [userId, yearStart],
      ),
      this.calendarOverrideRepo
        .createQueryBuilder('o')
        .where('o.userId = :userId', { userId })
        .andWhere('o.dateKey >= :from AND o.dateKey <= :to', { from: yearStartKey, to: yearEndKey })
        .getMany(),
    ]);

    const overrideByDate = new Map(overrides.map((row) => [row.dateKey, row]));
    const keyConfig = {
      present: settings.attendancePresentKey || 'P',
      late: settings.attendanceLateKey || 'L',
      weeklyOff: settings.attendanceWeeklyOffKey || 'W',
      excusedLeave: settings.attendanceExcusedAbsenceKey || 'U',
      unwantedLeave: settings.attendanceUnexcusedAbsenceKey || 'A',
    };

    const monthNames = Array.from({ length: 12 }, (_, month) => new Date(year, month, 1).toLocaleString('en-US', { month: 'long' }));
    const monthly = monthNames.map((label, month) => this.makeEmptyPresenceBucket(label, { month: month + 1 }));
    const weeklyMap = new Map<string, any>();
    const yearSummary = this.makeEmptyPresenceBucket(String(year), { year });
    const daily: any[] = [];

    const sortedEvents = (events || []).slice().sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    let eventIndex = 0;
    let currentState: UserPresenceState = baselineRows?.[0]?.state ? safeState(baselineRows[0].state) : 'offline';

    for (let month = 0; month < 12; month += 1) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = this.dateKeyForMonthDay(year, month, day);
        if (dateKey > todayKey) continue;
        if (dateKey < employeeStartKey) continue;

        const dayStart = this.dateFromDhakaKey(dateKey);
        const naturalDayEnd = this.dateFromDhakaKey(dateKey, true);
        const dayEnd = dateKey === todayKey && now < naturalDayEnd ? now : naturalDayEnd;
        const dayEvents: UserPresenceEvent[] = [];
        while (eventIndex < sortedEvents.length) {
          const eventTime = new Date(sortedEvents[eventIndex].occurredAt);
          if (eventTime < dayStart) {
            currentState = safeState(sortedEvents[eventIndex].state);
            eventIndex += 1;
            continue;
          }
          if (eventTime > dayEnd) break;
          dayEvents.push(sortedEvents[eventIndex]);
          eventIndex += 1;
        }

        let cursor = dayStart;
        let dayState = currentState;
        let onlineSeconds = 0;
        let checkIns = 0;
        let checkOuts = 0;
        let firstOnlineAt: Date | null = dayState === 'online' ? dayStart : null;

        for (const event of dayEvents) {
          const eventTime = new Date(event.occurredAt);
          if (dayState === 'online') {
            onlineSeconds += Math.max(0, Math.floor((eventTime.getTime() - cursor.getTime()) / 1000));
          }
          dayState = safeState(event.state);
          if (dayState === 'online') {
            checkIns += 1;
            if (!firstOnlineAt) firstOnlineAt = eventTime;
          } else {
            checkOuts += 1;
          }
          cursor = eventTime;
        }
        if (dayState === 'online') {
          onlineSeconds += Math.max(0, Math.floor((dayEnd.getTime() - cursor.getTime()) / 1000));
        }
        currentState = dayState;

        const weekday = new Date(`${dateKey}T12:00:00+06:00`).toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone });
        const override = overrideByDate.get(dateKey);
        let verdict: 'present' | 'late' | 'weeklyOff' | 'excusedLeave' | 'unwantedLeave' | 'custom' = 'unwantedLeave';
        let label = settings.attendanceUnexcusedAbsenceLabel || 'Unexcused absence';
        let isManual = false;
        const firstMinutes = firstOnlineAt
          ? Number(firstOnlineAt.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: timezone })) * 60 +
            Number(firstOnlineAt.toLocaleString('en-US', { minute: '2-digit', timeZone: timezone }))
          : null;
        const selectedBackupRule = employee.presenceStatus === 'backup'
          ? this.chooseBackupRuleForMinutes(backupRules, firstMinutes)
          : null;
        const effectiveOfficeStartMinutes = selectedBackupRule ? this.timeToMinutes(selectedBackupRule.officeStartTime) : officeStartMinutes;
        const effectiveCautionMinutes = selectedBackupRule ? Math.max(0, Math.min(240, Number(selectedBackupRule.cautionMinutes || 0))) : cautionMinutes;

        if (override) {
          isManual = true;
          const key = override.attendanceKey;
          if (key === keyConfig.present) verdict = 'present';
          else if (key === keyConfig.late) verdict = 'late';
          else if (key === keyConfig.weeklyOff) verdict = 'weeklyOff';
          else if (key === keyConfig.excusedLeave) verdict = 'excusedLeave';
          else if (key === keyConfig.unwantedLeave) verdict = 'unwantedLeave';
          else verdict = 'custom';
          label = override.attendanceLabel || override.attendanceKey;
        } else if (employee.presenceStatus !== 'backup' && officeTime?.weeklyDayOff && officeTime.weeklyDayOff.toLowerCase() === weekday.toLowerCase()) {
          verdict = 'weeklyOff';
          label = settings.attendanceWeeklyOffLabel || 'Weekly off day';
        } else if (firstOnlineAt) {
          verdict = (firstMinutes || 0) > effectiveOfficeStartMinutes + effectiveCautionMinutes ? 'late' : 'present';
          label = verdict === 'late' ? (settings.attendanceLateLabel || 'Late') : (settings.attendancePresentLabel || 'Present');
        }

        const weekKey = this.weekKeyForDateKey(dateKey, timezone);
        const week = weeklyMap.get(weekKey) || this.makeEmptyPresenceBucket(`Week of ${weekKey.split('-').reverse().join('/')}`, { weekKey });
        weeklyMap.set(weekKey, week);

        const buckets = [monthly[month], week, yearSummary];
        for (const bucket of buckets) {
          bucket.days += 1;
          bucket.totalOnlineSeconds += onlineSeconds;
          bucket.checkIns += checkIns;
          bucket.checkOuts += checkOuts;
          if (isManual) bucket.manualOverrides += 1;
          if (verdict !== 'weeklyOff') bucket.countedDays += 1;
          if (verdict in bucket) bucket[verdict] += 1;
          if ((verdict === 'present' || verdict === 'late') && firstMinutes != null) {
            const attendedBefore = bucket.present + bucket.late - 1;
            bucket.avgCheckInMinutes = bucket.avgCheckInMinutes == null
              ? firstMinutes
              : ((bucket.avgCheckInMinutes * attendedBefore) + firstMinutes) / Math.max(1, attendedBefore + 1);
          }
        }

        daily.push({
          dateKey,
          weekday,
          verdict,
          label,
          isManual,
          firstEntryTime: this.minutesToTimeLabel(firstMinutes),
          onlineSeconds,
          onlineHours: this.secondsToHours(onlineSeconds),
          checkIns,
          checkOuts,
        });
      }
    }

    const finalizedMonthly = monthly.map((bucket) => this.finalizePresenceBucket(bucket));
    const finalizedWeekly = Array.from(weeklyMap.values())
      .sort((a, b) => String(a.weekKey).localeCompare(String(b.weekKey)))
      .map((bucket) => this.finalizePresenceBucket(bucket));
    const finalizedYear = this.finalizePresenceBucket(yearSummary);

    return {
      employee,
      year,
      timezone,
      officeTime: {
        officeStartTime: officeStart,
        officeEndTime: officeEnd,
        cautionMinutes,
        weeklyDayOff: employee.presenceStatus === 'backup' ? null : officeTime?.weeklyDayOff || null,
        lunchBreakStartTime: firstBackupRule?.lunchBreakStartTime || officeTime?.lunchBreakStartTime || null,
        lunchBreakEndTime: firstBackupRule?.lunchBreakEndTime || officeTime?.lunchBreakEndTime || null,
      },
      summary: finalizedYear,
      monthly: finalizedMonthly,
      weekly: finalizedWeekly,
      daily,
      recentDaily: daily.slice(-45).reverse(),
      generatedAt: new Date().toISOString(),
    };
  }

  async generatePresenceStatisticsPdf(params: { userId?: number; year?: number; month?: number | string }) {
    const stats = await this.getPresenceStatistics(params);
    const parsedMonth = params.month === 'all' || params.month == null || params.month === ''
      ? null
      : clampInt(Number(params.month), 1, 12, 0);
    const selectedBucket = parsedMonth ? stats.monthly.find((row: any) => Number(row.month) === parsedMonth) : stats.summary;
    if (!selectedBucket) throw new BadRequestException('Invalid month selected');
    const selectedPeriod = parsedMonth ? `${selectedBucket.label} ${stats.year}` : `${stats.year} - All Months`;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 42 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const dark = '#111827';
      const muted = '#6b7280';
      const line = '#e5e7eb';
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      const writeHeader = () => {
        doc.rect(0, 0, doc.page.width, 92).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('Presence Attendance Summary', 42, 28);
        doc.fontSize(10).font('Helvetica').fillColor('#cbd5e1').text(`Generated: ${new Date(stats.generatedAt).toLocaleString('en-GB', { timeZone: stats.timezone })}`, 42, 56);
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text(selectedPeriod, doc.page.width - 220, 34, { width: 178, align: 'right' });
        doc.moveDown();
      };

      const addFooter = () => {
        const page = doc.page;
        doc.fontSize(8).fillColor('#9ca3af').text('TrustCart ERP - Presence Module', 42, page.height - 34, { width: pageWidth, align: 'center' });
      };

      const tableRow = (values: string[], widths: number[], y: number, header = false) => {
        let x = 42;
        const rowHeight = header ? 30 : 42;
        if (header) doc.rect(42, y, pageWidth, rowHeight).fill('#eff6ff');
        values.forEach((value, idx) => {
          doc.fillColor(header ? '#1e3a8a' : dark)
            .font('Helvetica-Bold')
            .fontSize(header ? 9 : 15)
            .text(value, x + 8, y + (header ? 10 : 13), { width: widths[idx] - 16, align: 'center', ellipsis: true });
          x += widths[idx];
        });
        doc.moveTo(42, y + rowHeight).lineTo(42 + pageWidth, y + rowHeight).strokeColor(line).stroke();
        return y + rowHeight;
      };

      writeHeader();
      doc.y = 116;
      doc.fillColor(dark).fontSize(15).font('Helvetica-Bold').text(stats.employee.name || `Employee #${stats.employee.id}`);
      doc.fillColor(muted).fontSize(9).font('Helvetica').text([
        stats.employee.roleName,
        stats.employee.teamLeaderName ? `TL: ${stats.employee.teamLeaderName}` : null,
        stats.employee.email,
      ].filter(Boolean).join('   |   '));
      doc.moveDown(0.5);
      doc.text(`Office: ${stats.officeTime.officeStartTime} - ${stats.officeTime.officeEndTime}   Grace: ${stats.officeTime.cautionMinutes} min   Weekly Off: ${stats.officeTime.weeklyDayOff || '-'}`);
      doc.moveDown(1.2);
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(13).text(`Period: ${selectedPeriod}`);
      doc.moveTo(42, doc.y + 6).lineTo(doc.page.width - 42, doc.y + 6).strokeColor(line).stroke();
      doc.moveDown(1.2);

      const widths = [pageWidth / 5, pageWidth / 5, pageWidth / 5, pageWidth / 5, pageWidth / 5];
      let y = tableRow(['Present', 'Late', 'Absent', 'Excused Off', 'Weekly Off'], widths, doc.y, true);
      tableRow([
        String(selectedBucket.present || 0),
        String(selectedBucket.late || 0),
        String(selectedBucket.unwantedLeave || 0),
        String(selectedBucket.excusedLeave || 0),
        String(selectedBucket.weeklyOff || 0),
      ], widths, y);

      addFooter();
      doc.end();
    });
  }

  async getCalendar(params?: { sheetName?: string }) {
    const settings = await this.getSettings();
    const timezone = settings.timezone || 'Asia/Dhaka';
    const sheetName = String(params?.sheetName || settings.summarySheetName || this.getDefaultMonthSheetName()).trim();
    const { year, monthIndex, days } = this.getDaysInSheetMonth(sheetName, timezone);
    const todayKey = this.getDhakaDateKey(new Date(), timezone);
    const monthStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 2, 23, 59, 59));

    const users = await this.getPresenceVisibleUsers(['active', 'backup']);
    const userIds = users.map((u) => Number(u.id));
    const presenceProfiles = await this.getPresenceProfilesForUsers(userIds);
    const backupRulesByUserId = await this.getBackupRulesByUserIds(userIds);
    const userMetaRows: Array<{
      id: number;
      team_leader_id: number | null;
      team_leader_name: string | null;
      team_leader_last_name: string | null;
      role_id: number | null;
      role_name: string | null;
      role_slug: string | null;
      role_priority: number | null;
    }> = userIds.length
      ? await this.userRepo.manager.query(
          `SELECT
             u.id,
             u.team_leader_id,
             tl.name AS team_leader_name,
             tl.last_name AS team_leader_last_name,
             u.role_id,
             r.name AS role_name,
             r.slug AS role_slug,
             r.priority AS role_priority
           FROM users u
           LEFT JOIN users tl ON tl.id = u.team_leader_id
           LEFT JOIN roles r ON r.id = u.role_id
           WHERE u.id = ANY($1::int[])`,
          [userIds],
        )
      : [];
    const userMetaById = new Map(userMetaRows.map((row) => [Number(row.id), row]));
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
      if (order.length === 0) {
        const am = userMetaById.get(Number(a.id));
        const bm = userMetaById.get(Number(b.id));
        const ar = Number(am?.role_priority || 0);
        const br = Number(bm?.role_priority || 0);
        if (ar !== br) return br - ar;
        const atl = am?.team_leader_id == null ? Number.MAX_SAFE_INTEGER : Number(am.team_leader_id);
        const btl = bm?.team_leader_id == null ? Number.MAX_SAFE_INTEGER : Number(bm.team_leader_id);
        if (atl !== btl) return atl - btl;
      }
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
      const meta = userMetaById.get(userId);
      const officeTime = officeTimeByUser.get(userId);
      const presenceStatus = this.cleanPresenceUserStatus(presenceProfiles.get(userId)?.status);
      const backupRules = backupRulesByUserId.get(userId) || [];
      const firstBackupRule = backupRules[0] || null;
      const userOfficeStart = firstBackupRule?.officeStartTime || officeTime?.officeStartTime || settings.officeStartTime;
      const userOfficeStartMinutes = this.timeToMinutes(userOfficeStart);
      return {
        userId,
        name: [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.email,
        email: user.email,
        teamLeaderId: meta?.team_leader_id == null ? null : Number(meta.team_leader_id),
        teamLeaderName: [meta?.team_leader_name, meta?.team_leader_last_name].filter(Boolean).join(' ').trim() || null,
        roleId: meta?.role_id == null ? null : Number(meta.role_id),
        roleName: meta?.role_name || null,
        roleSlug: meta?.role_slug || null,
        rolePriority: meta?.role_priority == null ? 0 : Number(meta.role_priority),
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
          if (presenceStatus !== 'backup' && officeTime?.weeklyDayOff && officeTime.weeklyDayOff.toLowerCase() === new Date(`${day.key}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()) {
            return { dateKey: day.key, value: keyConfig.weeklyOff.key, label: keyConfig.weeklyOff.label, color: keyConfig.weeklyOff.color };
          }
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
          const selectedBackupRule = presenceStatus === 'backup' ? this.chooseBackupRuleForMinutes(backupRules, firstMinutes) : null;
          const effectiveOfficeStartMinutes = selectedBackupRule ? this.timeToMinutes(selectedBackupRule.officeStartTime) : userOfficeStartMinutes;
          const cautionMinutes = selectedBackupRule
            ? Math.max(0, Math.min(240, Number(selectedBackupRule.cautionMinutes || 0)))
            : Math.max(0, Math.min(240, Number(officeTime?.cautionMinutes || 0)));
          const config = firstMinutes > effectiveOfficeStartMinutes + cautionMinutes ? keyConfig.late : keyConfig.present;
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

  async getPresenceStatusUsers(statusRaw?: any) {
    const requestedStatus = String(statusRaw || 'active').trim().toLowerCase();
    const allowedFilter = new Set(['active', 'inactive', 'backup']);
    const statusFilter = allowedFilter.has(requestedStatus) ? requestedStatus : 'active';

    let rows: any[] = [];
    try {
      rows = await this.userRepo.manager.query(
        `SELECT
           u.id,
           NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))), '') AS name,
           u.email,
           u.phone,
           u.status AS account_status,
           COALESCE(pup.status, 'active') AS presence_status,
           pup.notes AS presence_notes,
           u.team_leader_id,
           NULLIF(TRIM(CONCAT(COALESCE(tl.name, ''), ' ', COALESCE(tl.last_name, ''))), '') AS team_leader_name,
           r.name AS role_name,
           r.slug AS role_slug
         FROM users u
         LEFT JOIN presence_user_profiles pup ON pup.user_id = u.id
         LEFT JOIN users tl ON tl.id = u.team_leader_id
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE COALESCE(u.is_deleted, false) = false
           AND COALESCE(pup.status, 'active') = $1
         ORDER BY name ASC, u.email ASC`,
        [statusFilter],
      );
    } catch (error: any) {
      if (!isMissingRelationError(error)) throw error;
      if (statusFilter !== 'active') rows = [];
      else {
        rows = await this.userRepo.manager.query(
          `SELECT
             u.id,
             NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))), '') AS name,
             u.email,
             u.phone,
             u.status AS account_status,
             'active' AS presence_status,
             NULL AS presence_notes,
             u.team_leader_id,
             NULLIF(TRIM(CONCAT(COALESCE(tl.name, ''), ' ', COALESCE(tl.last_name, ''))), '') AS team_leader_name,
             r.name AS role_name,
             r.slug AS role_slug
           FROM users u
           LEFT JOIN users tl ON tl.id = u.team_leader_id
           LEFT JOIN roles r ON r.id = u.role_id
           WHERE COALESCE(u.is_deleted, false) = false
           ORDER BY name ASC, u.email ASC`,
        );
      }
    }

    return {
      status: statusFilter,
      items: (rows || []).map((row: any) => ({
        userId: Number(row.id),
        name: row.name || row.email || `User #${row.id}`,
        email: row.email || null,
        phone: row.phone || null,
        accountStatus: row.account_status || null,
        presenceStatus: this.cleanPresenceUserStatus(row.presence_status),
        notes: row.presence_notes || '',
        teamLeaderId: row.team_leader_id == null ? null : Number(row.team_leader_id),
        teamLeaderName: row.team_leader_name || null,
        roleName: row.role_name || null,
        roleSlug: row.role_slug || null,
      })),
    };
  }

  async updatePresenceUserStatus(userIdRaw: any, input: { status?: string; notes?: string | null }) {
    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId) || userId <= 0) throw new BadRequestException('Valid user ID is required');
    const status = this.cleanPresenceUserStatus(input?.status);
    const user = await this.userRepo.findOne({ where: { id: userId, isDeleted: false } as any });
    if (!user) throw new BadRequestException('User not found');

    let row = await this.presenceUserProfileRepo.findOne({ where: { userId } });
    if (!row) row = this.presenceUserProfileRepo.create({ userId });
    row.status = status;
    row.notes = String(input?.notes || '').trim() || null;
    const saved = await this.presenceUserProfileRepo.save(row);

    if (status !== 'backup') {
      await this.backupTeamOfficeTimeRepo.delete({ userId } as any);
    }

    if (status === 'inactive') {
      const now = new Date();
      const currentStatus = await this.getOrCreateStatus(userId);
      if (currentStatus.state !== 'offline') {
        await this.eventRepo.save(this.eventRepo.create({
          userId,
          state: 'offline',
          source: 'presence-status',
          occurredAt: now,
        }));
        currentStatus.lastChangedAt = now;
      }
      currentStatus.state = 'offline';
      currentStatus.source = 'presence-status';
      currentStatus.lastSeenAt = now;
      await this.statusRepo.save(currentStatus);
    }

    return {
      userId,
      presenceStatus: saved.status,
      notes: saved.notes || '',
    };
  }

  async getBackupTeam() {
    const users = await this.getPresenceVisibleUsers(['backup']);
    const userIds = users.map((user) => Number(user.id));
    const rows = userIds.length
      ? await this.backupTeamOfficeTimeRepo.find({ where: { userId: In(userIds) } as any, order: { userId: 'ASC', sortOrder: 'ASC', id: 'ASC' } as any })
      : [];
    const byUserId = new Map<number, BackupTeamOfficeTime[]>();
    for (const row of rows) {
      const list = byUserId.get(Number(row.userId)) || [];
      list.push(row);
      byUserId.set(Number(row.userId), list);
    }

    return {
      items: users.map((user) => ({
        userId: Number(user.id),
        name: [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.email,
        email: user.email,
        phone: user.phone,
        rules: (byUserId.get(Number(user.id)) || []).map((row) => ({
          id: row.id,
          officeStartTime: row.officeStartTime,
          officeEndTime: row.officeEndTime,
          cautionMinutes: row.cautionMinutes || 0,
          lunchBreakStartTime: row.lunchBreakStartTime || '',
          lunchBreakEndTime: row.lunchBreakEndTime || '',
          sortOrder: row.sortOrder || 0,
          notes: row.notes || '',
        })),
      })),
    };
  }

  async updateBackupTeamRules(userIdRaw: any, input: { rules?: any[] }) {
    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId) || userId <= 0) throw new BadRequestException('Valid user ID is required');
    const profile = await this.presenceUserProfileRepo.findOne({ where: { userId } });
    if (this.cleanPresenceUserStatus(profile?.status) !== 'backup') {
      throw new BadRequestException('Only backup status users can have backup team roster rules');
    }

    const rawRules = Array.isArray(input?.rules) ? input.rules : [];
    const rules = rawRules.slice(0, 6).map((rule, index) => {
      const officeStartTime = this.validateTimeValue(rule?.officeStartTime, 'Office start time', true);
      const officeEndTime = this.validateTimeValue(rule?.officeEndTime, 'Office end time', true);
      const lunchBreakStartTime = this.validateTimeValue(rule?.lunchBreakStartTime, 'Lunch break start time');
      const lunchBreakEndTime = this.validateTimeValue(rule?.lunchBreakEndTime, 'Lunch break end time');
      return this.backupTeamOfficeTimeRepo.create({
        userId,
        officeStartTime,
        officeEndTime,
        cautionMinutes: clampInt(rule?.cautionMinutes, 0, 240, 0),
        lunchBreakStartTime: lunchBreakStartTime || null,
        lunchBreakEndTime: lunchBreakEndTime || null,
        sortOrder: index,
        notes: String(rule?.notes || '').trim() || null,
      });
    });

    await this.backupTeamOfficeTimeRepo.manager.transaction(async (manager) => {
      await manager.delete(BackupTeamOfficeTime, { userId });
      if (rules.length > 0) await manager.save(BackupTeamOfficeTime, rules);
    });

    return this.getBackupTeam();
  }

  async getOfficeTimes() {
    const users = await this.getPresenceVisibleUsers(['active']);
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
          weeklyDayOff: row?.weeklyDayOff || '',
          cautionMinutes: row?.cautionMinutes || 0,
          lunchBreakStartTime: row?.lunchBreakStartTime || '',
          lunchBreakEndTime: row?.lunchBreakEndTime || '',
          notes: row?.notes || '',
        };
      }),
    };
  }

  async updateOfficeTime(
    userIdRaw: any,
    input: {
      officeStartTime?: string | null;
      officeEndTime?: string | null;
      weeklyDayOff?: string | null;
      cautionMinutes?: number | string | null;
      lunchBreakStartTime?: string | null;
      lunchBreakEndTime?: string | null;
      notes?: string | null;
    },
  ) {
    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId) || userId <= 0) throw new BadRequestException('Valid user ID is required');

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const officeStartTime = String(input.officeStartTime || '').trim();
    const officeEndTime = String(input.officeEndTime || '').trim();
    const lunchBreakStartTime = String(input.lunchBreakStartTime || '').trim();
    const lunchBreakEndTime = String(input.lunchBreakEndTime || '').trim();
    if (officeStartTime && !timePattern.test(officeStartTime)) throw new BadRequestException('Office start time must be HH:mm');
    if (officeEndTime && !timePattern.test(officeEndTime)) throw new BadRequestException('Office end time must be HH:mm');
    if (lunchBreakStartTime && !timePattern.test(lunchBreakStartTime)) throw new BadRequestException('Lunch break start time must be HH:mm');
    if (lunchBreakEndTime && !timePattern.test(lunchBreakEndTime)) throw new BadRequestException('Lunch break end time must be HH:mm');
    const cautionMinutes = clampInt((input as any).cautionMinutes, 0, 240, 0);
    const weeklyDayOff = String(input.weeklyDayOff || '').trim().toLowerCase();
    const validWeeklyDays = new Set(['', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
    if (!validWeeklyDays.has(weeklyDayOff)) throw new BadRequestException('Weekly day off must be a valid weekday');

    let row = await this.officeTimeRepo.findOne({ where: { userId } });
    if (!row) row = this.officeTimeRepo.create({ userId });
    row.officeStartTime = officeStartTime || null;
    row.officeEndTime = officeEndTime || null;
    row.weeklyDayOff = weeklyDayOff || null;
    row.cautionMinutes = cautionMinutes;
    row.lunchBreakStartTime = lunchBreakStartTime || null;
    row.lunchBreakEndTime = lunchBreakEndTime || null;
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
    const previous = existing
      ? {
          attendanceKey: existing.attendanceKey,
          attendanceLabel: existing.attendanceLabel,
          note: existing.note,
        }
      : null;
    if (!attendanceKey) {
      if (existing) {
        await this.calendarOverrideRepo.remove(existing);
        await this.calendarOverrideHistoryRepo.save(
          this.calendarOverrideHistoryRepo.create({
            userId,
            dateKey,
            action: 'cleared',
            previousAttendanceKey: previous?.attendanceKey || null,
            previousAttendanceLabel: previous?.attendanceLabel || null,
            previousNote: previous?.note || null,
            newAttendanceKey: null,
            newAttendanceLabel: null,
            newNote: null,
            updatedBy: updatedBy || null,
          }),
        );
      }
      return { deleted: true };
    }
    if (!configByKey.has(attendanceKey)) throw new BadRequestException('Attendance key is not configured');

    const row = existing || this.calendarOverrideRepo.create({ userId, dateKey });
    const nextLabel = configByKey.get(attendanceKey) || null;
    const nextNote = String(input.note || '').trim() || null;
    row.attendanceKey = attendanceKey;
    row.attendanceLabel = nextLabel;
    row.note = nextNote;
    row.updatedBy = updatedBy || null;
    const saved = await this.calendarOverrideRepo.save(row);

    await this.calendarOverrideHistoryRepo.save(
      this.calendarOverrideHistoryRepo.create({
        userId,
        dateKey,
        action: previous ? 'updated' : 'created',
        previousAttendanceKey: previous?.attendanceKey || null,
        previousAttendanceLabel: previous?.attendanceLabel || null,
        previousNote: previous?.note || null,
        newAttendanceKey: saved.attendanceKey,
        newAttendanceLabel: saved.attendanceLabel || null,
        newNote: saved.note || null,
        updatedBy: updatedBy || null,
      }),
    );

    return saved;
  }

  async getCalendarOverrideHistory(userIdRaw: any, dateKeyRaw: any) {
    const userId = Number(userIdRaw);
    const dateKey = String(dateKeyRaw || '').trim();
    if (!Number.isFinite(userId) || userId <= 0) throw new BadRequestException('Valid user ID is required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new BadRequestException('Date key must be YYYY-MM-DD');

    const rows = await this.calendarOverrideHistoryRepo.find({
      where: { userId, dateKey } as any,
      order: { createdAt: 'DESC' } as any,
      take: 100,
    });
    const updaterIds = Array.from(new Set(rows.map((row) => Number(row.updatedBy)).filter((id) => Number.isFinite(id) && id > 0)));
    const updaters = updaterIds.length ? await this.userRepo.find({ where: { id: In(updaterIds) } as any }) : [];
    const updaterById = new Map(updaters.map((user) => [Number(user.id), user]));

    return {
      items: rows.map((row) => {
        const updater = row.updatedBy ? updaterById.get(Number(row.updatedBy)) : null;
        return {
          id: row.id,
          userId: row.userId,
          dateKey: row.dateKey,
          action: row.action,
          previousAttendanceKey: row.previousAttendanceKey,
          previousAttendanceLabel: row.previousAttendanceLabel,
          previousNote: row.previousNote,
          newAttendanceKey: row.newAttendanceKey,
          newAttendanceLabel: row.newAttendanceLabel,
          newNote: row.newNote,
          updatedBy: row.updatedBy,
          updatedByName: updater ? [updater.name, updater.lastName].filter(Boolean).join(' ').trim() || updater.email : null,
          updatedByEmail: updater?.email || null,
          createdAt: row.createdAt,
        };
      }),
    };
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
