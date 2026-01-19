import { Injectable } from '@nestjs/common';

export type AgentPresenceStatus = 'online' | 'on_call' | 'break' | 'offline';

export interface AgentPresenceRecord {
  userId: number;
  status: AgentPresenceStatus;
  updatedAt: Date;
}

@Injectable()
export class TelephonyPresenceService {
  // In-memory store (sufficient for dev/single instance).
  // If you need multi-instance durability, swap this for Redis.
  private readonly presenceByUserId = new Map<number, AgentPresenceRecord>();

  get(userId: number): AgentPresenceRecord {
    const existing = this.presenceByUserId.get(userId);
    if (existing) return existing;

    const record: AgentPresenceRecord = { userId, status: 'offline', updatedAt: new Date(0) };
    this.presenceByUserId.set(userId, record);
    return record;
  }

  set(userId: number, status: AgentPresenceStatus): AgentPresenceRecord {
    const record: AgentPresenceRecord = {
      userId,
      status,
      updatedAt: new Date(),
    };

    this.presenceByUserId.set(userId, record);
    return record;
  }

  list(): AgentPresenceRecord[] {
    return Array.from(this.presenceByUserId.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }
}
