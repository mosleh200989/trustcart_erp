import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { User } from '../users/user.entity';
import { UserPresenceEvent } from './entities/user-presence-event.entity';
import { UserPresenceState, UserPresenceStatus } from './entities/user-presence-status.entity';
import { PresenceSettings } from './entities/presence-settings.entity';

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

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(UserPresenceStatus)
    private readonly statusRepo: Repository<UserPresenceStatus>,
    @InjectRepository(UserPresenceEvent)
    private readonly eventRepo: Repository<UserPresenceEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PresenceSettings)
    private readonly settingsRepo: Repository<PresenceSettings>,
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

  async getMyStatus(userId: number) {
    return this.getOrCreateStatus(Number(userId));
  }

  async setMyStatus(userId: number, stateRaw: any, source = 'manual') {
    const userIdNum = Number(userId);
    const state = safeState(stateRaw);
    const now = new Date();
    const status = await this.getOrCreateStatus(userIdNum);

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
    return this.statusRepo.save(status);
  }

  async heartbeat(userId: number) {
    const status = await this.getOrCreateStatus(Number(userId));
    status.lastSeenAt = new Date();
    return this.statusRepo.save(status);
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
