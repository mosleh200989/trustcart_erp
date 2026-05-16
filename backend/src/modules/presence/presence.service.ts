import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserPresenceEvent } from './entities/user-presence-event.entity';
import { UserPresenceState, UserPresenceStatus } from './entities/user-presence-status.entity';

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

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(UserPresenceStatus)
    private readonly statusRepo: Repository<UserPresenceStatus>,
    @InjectRepository(UserPresenceEvent)
    private readonly eventRepo: Repository<UserPresenceEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
}
