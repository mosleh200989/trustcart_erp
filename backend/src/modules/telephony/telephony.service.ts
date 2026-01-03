import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { CallTask, TaskStatus } from '../crm/entities/call-task.entity';
import { User } from '../users/user.entity';
import { TelephonyCall, TelephonyCallStatus } from './entities/telephony-call.entity';

@Injectable()
export class TelephonyService {
  constructor(
    @InjectRepository(TelephonyCall)
    private telephonyCallRepo: Repository<TelephonyCall>,
    @InjectRepository(CallTask)
    private callTaskRepo: Repository<CallTask>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

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
      await this.telephonyCallRepo.save(inbound);
      return { status: 'ok' };
    }

    if (eventName === 'call_answered' && call) {
      call.status = TelephonyCallStatus.ANSWERED;
      if (!call.answeredAt) call.answeredAt = new Date();
      call.meta = { ...(call.meta || {}), lastWebhook: body, event: 'call_answered' };
      await this.telephonyCallRepo.save(call);
      return { status: 'ok' };
    }

    if (eventName === 'call_ended' && call) {
      call.status = TelephonyCallStatus.COMPLETED;
      if (!call.endedAt) call.endedAt = new Date();
      if (body?.duration != null) call.durationSeconds = Number(body.duration);
      if (!call.durationSeconds && call.answeredAt && call.endedAt) {
        call.durationSeconds = Math.max(0, Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000));
      }
      call.meta = { ...(call.meta || {}), lastWebhook: body, event: 'call_ended', end_reason: body?.end_reason };
      await this.telephonyCallRepo.save(call);

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
      return { status: 'ok' };
    }

    if (eventName === 'call_missed' || eventName === 'missed_call') {
      const customerPhone = String(fromNumber || '').trim();
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
    call.meta = { ...(call.meta || {}), lastWebhook: body };

    await this.telephonyCallRepo.save(call);

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
}
