import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { CallTask, TaskStatus } from '../crm/entities/call-task.entity';
import { Activity } from '../crm/entities/activity.entity';
import { CustomersService } from '../customers/customers.service';
import { User } from '../users/user.entity';
import { TelephonyCall, TelephonyCallStatus } from './entities/telephony-call.entity';
import { TelephonyGateway } from './telephony.gateway';
import { AgentPresenceStatus, TelephonyPresenceService } from './telephony-presence.service';
import { TelephonyAgentPresenceEvent } from './entities/telephony-agent-presence-event.entity';

@Injectable()
export class TelephonyService {
  constructor(
    @InjectRepository(TelephonyCall)
    private telephonyCallRepo: Repository<TelephonyCall>,
    @InjectRepository(TelephonyAgentPresenceEvent)
    private presenceEventRepo: Repository<TelephonyAgentPresenceEvent>,
    @InjectRepository(CallTask)
    private callTaskRepo: Repository<CallTask>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Activity)
    private activityRepo: Repository<Activity>,
    private readonly customersService: CustomersService,
    private readonly telephonyGateway: TelephonyGateway,
    private readonly presenceService: TelephonyPresenceService,
  ) {}

  private async recordPresenceEventIfChanged(userId: number, status: AgentPresenceStatus, source: string) {
    const prev = this.presenceService.get(userId);
    if (prev?.status === status) return;

    const ev = this.presenceEventRepo.create({
      userId,
      status,
      source: String(source || 'api'),
      occurredAt: new Date(),
    });
    try {
      await this.presenceEventRepo.save(ev);
    } catch {
      // Never block core flows on reporting persistence.
    }
  }

  private extractReportingFields(body: any) {
    const queueName =
      body?.queue_name ?? body?.queueName ?? body?.queue ?? body?.queue_id ?? body?.queueId ?? (body?.queue && body?.queue?.name);
    const trunkName = body?.trunk_name ?? body?.trunkName ?? body?.trunk ?? body?.trunk_id ?? body?.trunkId;

    const waitSecondsRaw = body?.wait_seconds ?? body?.waitSeconds ?? body?.wait_time ?? body?.waitTime;
    const holdSecondsRaw = body?.hold_seconds ?? body?.holdSeconds ?? body?.hold_time ?? body?.holdTime;

    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
    };

    const statusRaw = String(body?.status || body?.event || body?.end_reason || body?.disposition || '').toLowerCase();
    const disposition =
      body?.disposition ||
      body?.call_disposition ||
      (statusRaw.includes('abandon') ? 'abandoned' :
        statusRaw.includes('no_answer') ? 'no_answer' :
        statusRaw.includes('busy') ? 'busy' :
        statusRaw.includes('miss') ? 'missed' :
        statusRaw.includes('complete') || statusRaw.includes('ended') ? 'completed' :
        statusRaw.includes('answer') || statusRaw.includes('connect') ? 'answered' :
        statusRaw ? 'failed' : null);

    return {
      queueName: queueName != null ? String(queueName) : null,
      trunkName: trunkName != null ? String(trunkName) : null,
      waitSeconds: toNum(waitSecondsRaw),
      holdSeconds: toNum(holdSecondsRaw),
      disposition: disposition != null ? String(disposition) : null,
    };
  }

  private async tryLogCallAsCrmActivity(call: TelephonyCall, statusRaw?: string) {
    const alreadyLogged = Boolean((call.meta as any)?.crmActivityLogged);
    if (alreadyLogged) return;

    const effectiveAgentUserId =
      call.agentUserId ??
      (call.taskId
        ? (await this.callTaskRepo.findOne({ where: { id: call.taskId } }))?.assigned_agent_id ?? null
        : null);

    if (!effectiveAgentUserId) return;

    const customer = call.customerPhone
      ? await this.customersService.findByPhone(String(call.customerPhone)).catch(() => null)
      : null;
    if (!customer) return;

    const outcome = call.status === TelephonyCallStatus.COMPLETED ? 'completed' : 'failed';
    const descriptionParts = [
      `Telephony call ${outcome}.`,
      call.durationSeconds != null ? `Duration: ${call.durationSeconds}s.` : null,
      call.recordingUrl ? 'Recording attached.' : null,
      statusRaw ? `Provider status: ${statusRaw}.` : null,
    ].filter(Boolean);

    const activity = this.activityRepo.create({
      type: 'call',
      customerId: (customer as any).id,
      userId: effectiveAgentUserId,
      subject: 'Phone call',
      description: descriptionParts.join(' '),
      duration: call.durationSeconds ?? null,
      outcome,
      completedAt: call.endedAt ?? new Date(),
      recordingUrl: call.recordingUrl ?? null,
      metadata: {
        source: 'telephony',
        telephonyCallId: call.id,
        externalCallId: call.externalCallId,
        provider: call.provider,
        direction: call.direction,
        customerPhone: call.customerPhone,
      },
    } as any);

    await this.activityRepo.save(activity as any);

    call.meta = { ...(call.meta || {}), crmActivityLogged: true };
    await this.telephonyCallRepo.save(call);
  }

  async listCalls(params?: {
    status?: string;
    direction?: string;
    agentUserId?: number;
    customerPhone?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const safeLimit = Number.isFinite(params?.limit) ? Math.max(1, Math.min(200, Number(params?.limit))) : 50;
    const safePage = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const skip = (safePage - 1) * safeLimit;

    const query = this.telephonyCallRepo.createQueryBuilder('c');

    if (params?.status) {
      query.andWhere('c.status = :status', { status: String(params.status) });
    }
    if (params?.direction) {
      query.andWhere('c.direction = :direction', { direction: String(params.direction) });
    }
    if (params?.agentUserId != null && Number.isFinite(params.agentUserId)) {
      query.andWhere('c.agentUserId = :agentUserId', { agentUserId: Number(params.agentUserId) });
    }
    if (params?.customerPhone) {
      query.andWhere('c.customerPhone = :customerPhone', { customerPhone: String(params.customerPhone).trim() });
    }

    if (params?.from) {
      const fromDate = new Date(params.from);
      if (!Number.isNaN(fromDate.getTime())) {
        query.andWhere('c.startedAt >= :from', { from: fromDate });
      }
    }
    if (params?.to) {
      const toDate = new Date(params.to);
      if (!Number.isNaN(toDate.getTime())) {
        query.andWhere('c.startedAt <= :to', { to: toDate });
      }
    }

    query.orderBy('c.startedAt', 'DESC');

    const [items, total] = await query.skip(skip).take(safeLimit).getManyAndCount();
    return { items, total, page: safePage, limit: safeLimit };
  }

  async getCallById(id: number) {
    const call = await this.telephonyCallRepo.findOne({ where: { id } });
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  private setPresence(userId: number, status: AgentPresenceStatus, source: string = 'api') {
    void this.recordPresenceEventIfChanged(userId, status, source);
    const record = this.presenceService.set(userId, status);
    this.telephonyGateway.emitAgentPresence(record);
    return record;
  }

  async setAgentPresence(userId: number, status: AgentPresenceStatus) {
    const safe: AgentPresenceStatus = status === 'online' || status === 'on_call' || status === 'break' || status === 'offline'
      ? status
      : 'online';
    return this.setPresence(Number(userId), safe, 'api');
  }

  async getAgentPresence(userId: number) {
    return this.presenceService.get(Number(userId));
  }

  async listAgentPresence(params?: { teamId?: number }) {
    // Optionally filter by teamId if present (User.teamId exists).
    const all = this.presenceService.list();
    if (params?.teamId == null) return all;
    const users = await this.userRepo.find({ where: { teamId: Number(params.teamId) } as any });
    const allowed = new Set(users.map((u) => u.id));
    return all.filter((p) => allowed.has(p.userId));
  }

  private getProvider(): string {
    return process.env.TELEPHONY_PROVIDER || 'bracknet';
  }

  private getBracknetConfig() {
    return {
      baseUrl: process.env.BRACKNET_API_BASE_URL || '',
      apiKey: process.env.BRACKNET_API_KEY || '',
      webhookSecret: process.env.BRACKNET_WEBHOOK_SECRET || '',
    };
  }

  async initiateCall(params: { taskId: number; agentUserId?: number; agentPhone?: string; customerPhone?: string }) {
    const task = await this.callTaskRepo.findOne({ where: { id: params.taskId } });
    if (!task) throw new NotFoundException('Call task not found');

    const customerPhone = String(params.customerPhone || task.customer_id || '').trim();
    if (!customerPhone) throw new BadRequestException('Task has no customer phone');

    let agentPhone = params.agentPhone?.trim() || '';
    if (!agentPhone && params.agentUserId) {
      const agent = await this.userRepo.findOne({ where: { id: params.agentUserId } });
      agentPhone = agent?.phone?.trim() || '';
    }

    if (!agentPhone) {
      // In many call-center setups, agent uses an extension/SIP user.
      // We allow initiating call without agentPhone, provider may map by agentUserId.
      agentPhone = '';
    }

    const provider = this.getProvider();

    const call = this.telephonyCallRepo.create({
      provider,
      taskId: task.id,
      agentUserId: params.agentUserId ?? null,
      agentPhone: agentPhone || null,
      customerPhone,
      status: TelephonyCallStatus.INITIATED,
      meta: {
        reason: task.call_reason,
        priority: task.priority,
      },
    });

    const saved = await this.telephonyCallRepo.save(call);

    // Agent is now effectively engaged
    if (saved.agentUserId) {
      this.setPresence(saved.agentUserId, 'on_call');
    }

    // Mark task in-progress (telephony initiation is an explicit action)
    if (task.status === TaskStatus.PENDING) {
      task.status = TaskStatus.IN_PROGRESS;
      await this.callTaskRepo.save(task);
    }

    // Provider call (best-effort). If not configured, we return a "mock" response.
    if (provider === 'bracknet') {
      const cfg = this.getBracknetConfig();
      if (!cfg.baseUrl || !cfg.apiKey) {
        return {
          telephonyCallId: saved.id,
          provider,
          mode: 'mock',
          message: 'BRACKNET_API_BASE_URL/BRACKNET_API_KEY not set. Call initiation skipped.',
        };
      }

      // NOTE: Bracknet’s exact API fields may differ. This is an adapter stub.
      // Update endpoint/path/body according to Bracknet documentation.
      const res = await axios.post(
        `${cfg.baseUrl.replace(/\/$/, '')}/calls/initiate`,
        {
          agent: agentPhone || params.agentUserId,
          customerPhone,
          reference: { taskId: task.id, telephonyCallId: saved.id },
        },
        {
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const externalCallId = res?.data?.callId || res?.data?.id || null;
      if (externalCallId) {
        saved.externalCallId = String(externalCallId);
        await this.telephonyCallRepo.save(saved);
      }

      return {
        telephonyCallId: saved.id,
        provider,
        externalCallId: saved.externalCallId,
        mode: 'live',
      };
    }

    return { telephonyCallId: saved.id, provider, mode: 'mock', message: 'Unknown provider adapter' };
  }

  // Bracknet contract-compatible entrypoint (CRM -> Bracknet) using explicit customer number.
  async bracknetStartCall(params: {
    agent_extension?: string;
    agent_id?: string;
    customer_number: string;
    caller_id?: string;
    call_type?: string;
    crm_call_id?: string;
    taskId?: number;
    agentUserId?: number;
  }) {
    const customerPhone = String(params.customer_number || '').trim();
    if (!customerPhone) throw new BadRequestException('Missing customer_number');

    const provider = 'bracknet';
    const call = this.telephonyCallRepo.create({
      provider,
      taskId: params.taskId ?? null,
      agentUserId: params.agentUserId ?? null,
      agentPhone: params.agent_extension ? String(params.agent_extension) : null,
      customerPhone,
      direction: 'outbound',
      status: TelephonyCallStatus.INITIATED,
      meta: {
        contract: 'bracknet-v1',
        agent_extension: params.agent_extension,
        agent_id: params.agent_id,
        caller_id: params.caller_id,
        call_type: params.call_type,
        crm_call_id: params.crm_call_id,
      },
    });

    const saved = await this.telephonyCallRepo.save(call);

    // If linked to a task, mark it in-progress
    if (params.taskId) {
      const task = await this.callTaskRepo.findOne({ where: { id: params.taskId } });
      if (task && task.status === TaskStatus.PENDING) {
        task.status = TaskStatus.IN_PROGRESS;
        await this.callTaskRepo.save(task);
      }
    }

    const cfg = this.getBracknetConfig();
    if (!cfg.baseUrl || !cfg.apiKey) {
      return {
        status: 'success',
        bracknet_call_id: null,
        crm_call_id: params.crm_call_id || String(saved.id),
        message: 'Mock mode: BRACKNET_API_BASE_URL/BRACKNET_API_KEY not set. Call initiation skipped.',
        telephonyCallId: saved.id,
      };
    }

    // Adapter stub: align with Bracknet actual API.
    const res = await axios.post(
      `${cfg.baseUrl.replace(/\/$/, '')}/api/call/start`,
      {
        agent_extension: params.agent_extension,
        agent_id: params.agent_id,
        customer_number: customerPhone,
        caller_id: params.caller_id || 'TrustCart',
        call_type: params.call_type || 'outbound',
        crm_call_id: params.crm_call_id || `CRM-CALL-${saved.id}`,
      },
      {
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );

    const externalCallId = res?.data?.bracknet_call_id || res?.data?.callId || res?.data?.id || null;
    if (externalCallId) {
      saved.externalCallId = String(externalCallId);
      await this.telephonyCallRepo.save(saved);
    }

    return {
      status: 'success',
      bracknet_call_id: saved.externalCallId,
      message: 'Call initiated',
      telephonyCallId: saved.id,
    };
  }

  async bracknetHangup(params: { bracknet_call_id: string }) {
    const bracknetCallId = String(params.bracknet_call_id || '').trim();
    if (!bracknetCallId) throw new BadRequestException('Missing bracknet_call_id');

    const call = await this.telephonyCallRepo.findOne({ where: { externalCallId: bracknetCallId } });
    if (call) {
      call.status = TelephonyCallStatus.COMPLETED;
      if (!call.endedAt) call.endedAt = new Date();
      await this.telephonyCallRepo.save(call);
    }

    const cfg = this.getBracknetConfig();
    if (!cfg.baseUrl || !cfg.apiKey) return { status: 'ended', mode: 'mock' };

    // Adapter stub
    await axios.post(
      `${cfg.baseUrl.replace(/\/$/, '')}/api/call/hangup`,
      { bracknet_call_id: bracknetCallId },
      { headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
    );

    return { status: 'ended', mode: 'live' };
  }

  async bracknetTransfer(params: { bracknet_call_id: string; transfer_extension: string }) {
    const bracknetCallId = String(params.bracknet_call_id || '').trim();
    const transferExtension = String(params.transfer_extension || '').trim();
    if (!bracknetCallId) throw new BadRequestException('Missing bracknet_call_id');
    if (!transferExtension) throw new BadRequestException('Missing transfer_extension');

    const cfg = this.getBracknetConfig();
    if (!cfg.baseUrl || !cfg.apiKey) return { status: 'success', mode: 'mock' };

    // Adapter stub
    await axios.post(
      `${cfg.baseUrl.replace(/\/$/, '')}/api/call/transfer`,
      { bracknet_call_id: bracknetCallId, transfer_extension: transferExtension },
      { headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
    );
    return { status: 'success', mode: 'live' };
  }

  private async ensureCallbackTask(params: { customerPhone: string; reason: string; notes: string }) {
    const customerPhone = String(params.customerPhone || '').trim();
    if (!customerPhone) return;

    // Avoid duplicates for the same day
    const existing = await this.callTaskRepo.findOne({
      where: {
        customer_id: customerPhone,
        call_reason: params.reason,
        status: TaskStatus.PENDING,
      },
      order: { id: 'DESC' } as any,
    });
    if (existing) return;

    const task = this.callTaskRepo.create({
      customer_id: customerPhone,
      priority: 'warm' as any,
      call_reason: params.reason,
      status: TaskStatus.PENDING,
      notes: params.notes,
    });
    await this.callTaskRepo.save(task);
  }

  async handleBracknetEvent(event: string, body: any) {
    const eventName = String(event || body?.event || '').toLowerCase();
    const externalCallId = body?.bracknet_call_id || body?.callId || body?.id;

    // incoming_call / missed_call may not have call id
    const fromNumber = body?.from || body?.customer_number || body?.customerPhone;
    const toExtension = body?.to_extension || body?.agent_extension;

    if (!externalCallId && (eventName === 'call_answered' || eventName === 'call_ended' || eventName === 'call_recording_ready')) {
      throw new BadRequestException('Missing bracknet_call_id');
    }

    let call: TelephonyCall | null = null;
    if (externalCallId) {
      call = await this.telephonyCallRepo.findOne({ where: { externalCallId: String(externalCallId) } });
    }

    if (!call && externalCallId) {
      call = this.telephonyCallRepo.create({
        provider: 'bracknet',
        externalCallId: String(externalCallId),
        customerPhone: String(fromNumber || ''),
        agentPhone: toExtension ? String(toExtension) : null,
        direction: eventName === 'incoming_call' || body?.call_type === 'inbound' ? 'inbound' : 'outbound',
        status: TelephonyCallStatus.INITIATED,
        meta: { orphan: true, raw: body },
      });
      call = await this.telephonyCallRepo.save(call);
    }

    if (eventName === 'incoming_call') {
      // Create a minimal inbound call record + optional pending task for callback if needed.
      const inbound = this.telephonyCallRepo.create({
        provider: 'bracknet',
        externalCallId: externalCallId ? String(externalCallId) : null,
        customerPhone: String(fromNumber || ''),
        agentPhone: toExtension ? String(toExtension) : null,
        direction: 'inbound',
        status: TelephonyCallStatus.RINGING,
        meta: { event: 'incoming_call', raw: body },
      });

      const reporting = this.extractReportingFields(body);
      inbound.queueName = reporting.queueName;
      inbound.trunkName = reporting.trunkName;
      inbound.waitSeconds = reporting.waitSeconds;
      inbound.holdSeconds = reporting.holdSeconds;
      inbound.disposition = reporting.disposition;
      inbound.meta = { ...(inbound.meta || {}), reporting };

      const savedInbound = await this.telephonyCallRepo.save(inbound);

      // Screen-pop payload: known vs unknown caller
      const customerPhone = String(fromNumber || '').trim();
      const customer = customerPhone ? await this.customersService.findByPhone(customerPhone).catch(() => null) : null;
      this.telephonyGateway.emitIncomingCall({
        call: savedInbound,
        customer: customer
          ? { id: (customer as any).id, name: (customer as any).name, phone: (customer as any).phone, email: (customer as any).email }
          : null,
      });
      return { status: 'ok' };
    }

    if (eventName === 'call_answered' && call) {
      call.status = TelephonyCallStatus.ANSWERED;
      if (!call.answeredAt) call.answeredAt = new Date();
      const reporting = this.extractReportingFields(body);
      call.queueName = reporting.queueName ?? call.queueName;
      call.trunkName = reporting.trunkName ?? call.trunkName;
      call.holdSeconds = reporting.holdSeconds ?? call.holdSeconds;
      call.disposition = reporting.disposition ?? call.disposition;
      if (call.waitSeconds == null && call.answeredAt && call.startedAt) {
        call.waitSeconds = Math.max(0, Math.floor((call.answeredAt.getTime() - call.startedAt.getTime()) / 1000));
      }
      call.meta = {
        ...(call.meta || {}),
        lastWebhook: body,
        event: 'call_answered',
        reporting: { ...(((call.meta || {}) as any).reporting || {}), ...reporting },
      };
      await this.telephonyCallRepo.save(call);

      if (call.agentUserId) {
        this.setPresence(call.agentUserId, 'on_call', 'call');
      }

      this.telephonyGateway.emitCallUpdated({ call });
      return { status: 'ok' };
    }

    if (eventName === 'call_ended' && call) {
      call.status = TelephonyCallStatus.COMPLETED;
      if (!call.endedAt) call.endedAt = new Date();
      if (body?.duration != null) call.durationSeconds = Number(body.duration);
      if (!call.durationSeconds && call.answeredAt && call.endedAt) {
        call.durationSeconds = Math.max(0, Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000));
      }
      const reporting = this.extractReportingFields(body);
      call.queueName = reporting.queueName ?? call.queueName;
      call.trunkName = reporting.trunkName ?? call.trunkName;
      call.waitSeconds = reporting.waitSeconds ?? call.waitSeconds;
      call.holdSeconds = reporting.holdSeconds ?? call.holdSeconds;
      call.disposition = reporting.disposition ?? call.disposition ?? 'completed';
      call.meta = {
        ...(call.meta || {}),
        lastWebhook: body,
        event: 'call_ended',
        end_reason: body?.end_reason,
        reporting: { ...(((call.meta || {}) as any).reporting || {}), ...reporting },
      };
      await this.telephonyCallRepo.save(call);

      if (call.agentUserId) {
        this.setPresence(call.agentUserId, 'online', 'call');
      }

      this.telephonyGateway.emitCallUpdated({ call });

      if (call.taskId) {
        const task = await this.callTaskRepo.findOne({ where: { id: call.taskId } });
        if (task) {
          task.notes = `${task.notes || ''}\n[Telephony] Call ended. Duration: ${call.durationSeconds ?? 0}s`;
          await this.callTaskRepo.save(task);
        }
      }

      return { status: 'ok' };
    }

    if ((eventName === 'call_recording_ready' || eventName === 'call_recording') && call) {
      call.recordingUrl = body?.recording_url || body?.recordingUrl || call.recordingUrl;
      call.meta = { ...(call.meta || {}), lastWebhook: body, event: 'call_recording_ready' };
      await this.telephonyCallRepo.save(call);

      this.telephonyGateway.emitCallUpdated({ call });
      return { status: 'ok' };
    }

    if (eventName === 'call_missed' || eventName === 'missed_call') {
      const customerPhone = String(fromNumber || '').trim();

      // Persist a missed call record to support call-center reporting.
      try {
        const missed = this.telephonyCallRepo.create({
          provider: 'bracknet',
          externalCallId: externalCallId ? String(externalCallId) : null,
          customerPhone,
          agentPhone: toExtension ? String(toExtension) : null,
          direction: 'inbound',
          status: TelephonyCallStatus.FAILED,
          answeredAt: null,
          endedAt: new Date(),
          durationSeconds: 0,
          disposition: 'missed',
          meta: { event: 'missed_call', raw: body, end_reason: body?.end_reason || 'missed' },
        });
        const reporting = this.extractReportingFields(body);
        missed.queueName = reporting.queueName;
        missed.trunkName = reporting.trunkName;
        missed.waitSeconds = reporting.waitSeconds;
        missed.holdSeconds = reporting.holdSeconds;
        missed.meta = { ...(missed.meta || {}), reporting };
        await this.telephonyCallRepo.save(missed);
      } catch {
        // best-effort
      }

      await this.ensureCallbackTask({
        customerPhone,
        reason: 'missed_call',
        notes: `[Telephony] Missed call to extension ${toExtension || 'N/A'}`,
      });
      return { status: 'ok' };
    }

    // fallback to previous generic mapping
    return this.handleBracknetWebhook(body, {});
  }

  async handleBracknetWebhook(body: any, headers: Record<string, any>) {
    // Optional: verify signature if BRACKNET_WEBHOOK_SECRET is set.
    // Since provider spec is unknown, we do a minimal safe implementation.

    const externalCallId = body?.bracknet_call_id || body?.callId || body?.id;
    if (!externalCallId) {
      throw new BadRequestException('Missing callId');
    }

    const call = await this.telephonyCallRepo.findOne({
      where: { externalCallId: String(externalCallId) },
    });

    if (!call) {
      // Store orphan event for later debugging
      const orphan = this.telephonyCallRepo.create({
        provider: 'bracknet',
        externalCallId: String(externalCallId),
        customerPhone: String(body?.customerPhone || ''),
        status: TelephonyCallStatus.INITIATED,
        meta: { orphan: true, raw: body },
      });
      await this.telephonyCallRepo.save(orphan);
      return { success: true, message: 'Orphan call event stored' };
    }

    const statusRaw = String(body?.status || body?.event || body?.end_reason || '').toLowerCase();
    const map: Record<string, TelephonyCallStatus> = {
      ringing: TelephonyCallStatus.RINGING,
      answered: TelephonyCallStatus.ANSWERED,
      connected: TelephonyCallStatus.ANSWERED,
      completed: TelephonyCallStatus.COMPLETED,
      ended: TelephonyCallStatus.COMPLETED,
      call_ended: TelephonyCallStatus.COMPLETED,
      failed: TelephonyCallStatus.FAILED,
      busy: TelephonyCallStatus.FAILED,
      no_answer: TelephonyCallStatus.FAILED,
    };

    const newStatus = map[statusRaw] || call.status;
    call.status = newStatus;

    if (newStatus === TelephonyCallStatus.ANSWERED && !call.answeredAt) {
      call.answeredAt = new Date();
    }

    if ((newStatus === TelephonyCallStatus.COMPLETED || newStatus === TelephonyCallStatus.FAILED) && !call.endedAt) {
      call.endedAt = new Date();
      if (call.answeredAt) {
        call.durationSeconds = Math.max(0, Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000));
      }
    }

    call.recordingUrl = body?.recording_url || body?.recordingUrl || call.recordingUrl;

    const reporting = this.extractReportingFields(body);
    call.queueName = reporting.queueName ?? call.queueName;
    call.trunkName = reporting.trunkName ?? call.trunkName;
    call.waitSeconds = reporting.waitSeconds ?? call.waitSeconds;
    call.holdSeconds = reporting.holdSeconds ?? call.holdSeconds;
    call.disposition = reporting.disposition ?? call.disposition;
    if (call.waitSeconds == null && call.answeredAt && call.startedAt) {
      call.waitSeconds = Math.max(0, Math.floor((call.answeredAt.getTime() - call.startedAt.getTime()) / 1000));
    }
    call.meta = {
      ...(call.meta || {}),
      lastWebhook: body,
      reporting: { ...(((call.meta || {}) as any).reporting || {}), ...reporting },
    };

    await this.telephonyCallRepo.save(call);

    // Best-effort presence updates based on status transitions
    if (call.agentUserId) {
      if (newStatus === TelephonyCallStatus.ANSWERED) {
        this.setPresence(call.agentUserId, 'on_call', 'call');
      }
      if (newStatus === TelephonyCallStatus.COMPLETED || newStatus === TelephonyCallStatus.FAILED) {
        this.setPresence(call.agentUserId, 'online', 'call');
      }
    }

    this.telephonyGateway.emitCallUpdated({ call });

    // Auto-log call completion into CRM activity timeline (best-effort)
    if (newStatus === TelephonyCallStatus.COMPLETED || newStatus === TelephonyCallStatus.FAILED) {
      try {
        await this.tryLogCallAsCrmActivity(call, statusRaw);
      } catch {
        // never block webhook processing
      }
    }

    // Optional: update CRM call task when call ends
    if (call.taskId) {
      const task = await this.callTaskRepo.findOne({ where: { id: call.taskId } });
      if (task) {
        if (newStatus === TelephonyCallStatus.COMPLETED) {
          // Keep as in_progress until agent marks outcome; but we can set a note.
          task.notes = `${task.notes || ''}\n[Telephony] Call completed. Duration: ${call.durationSeconds ?? 0}s`;
          await this.callTaskRepo.save(task);
        }
        if (newStatus === TelephonyCallStatus.FAILED) {
          task.notes = `${task.notes || ''}\n[Telephony] Call failed (${statusRaw}).`;
          await this.callTaskRepo.save(task);
        }
      }
    }

    return { success: true };
  }

  async getDashboardStats(params?: { rangeDays?: number; agentUserId?: number }) {
    const safeRangeDays = Number.isFinite(params?.rangeDays) ? Math.max(1, Math.min(3650, Number(params?.rangeDays))) : 30;
    const since = new Date();
    since.setDate(since.getDate() - safeRangeDays);

    const base = this.telephonyCallRepo
      .createQueryBuilder('c')
      .where('c.startedAt >= :since', { since });

    if (params?.agentUserId != null) {
      base.andWhere('c.agentUserId = :agentUserId', { agentUserId: Number(params.agentUserId) });
    }

    const [total, byStatusRaw, durationAggRaw, withRecordingRaw, failedByReasonRaw] = await Promise.all([
      base.clone().getCount(),
      base
        .clone()
        .select('c.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('c.status')
        .getRawMany<{ status: string; count: string }>(),
      base
        .clone()
        .select('COALESCE(AVG(c.durationSeconds), 0)', 'avgDurationSeconds')
        .addSelect('COALESCE(SUM(c.durationSeconds), 0)', 'totalDurationSeconds')
        .getRawOne<{ avgdurationseconds: string; totaldurationseconds: string }>(),
      base
        .clone()
        .andWhere('c.recordingUrl IS NOT NULL')
        .getCount(),
      base
        .clone()
        .andWhere('c.status = :failed', { failed: TelephonyCallStatus.FAILED })
        .select(
          "COALESCE(c.meta->>'end_reason', c.meta->'lastWebhook'->>'end_reason', 'failed')",
          'reason',
        )
        .addSelect('COUNT(*)', 'count')
        .groupBy('reason')
        .getRawMany<{ reason: string; count: string }>(),
    ]);

    return {
      rangeDays: safeRangeDays,
      since,
      total,
      byStatus: (byStatusRaw || []).map((r) => ({
        status: r.status,
        count: Number(r.count || 0),
      })),
      avgDurationSeconds: Number((durationAggRaw as any)?.avgdurationseconds ?? 0),
      totalDurationSeconds: Number((durationAggRaw as any)?.totaldurationseconds ?? 0),
      withRecordingCount: withRecordingRaw,
      failedByReason: (failedByReasonRaw || []).map((r) => ({
        reason: r.reason,
        count: Number(r.count || 0),
      })),
    };
  }
}
