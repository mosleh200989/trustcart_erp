import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TelephonyService } from './telephony.service';

// Bracknet ↔ CRM API Contract compatibility endpoints.
// These routes intentionally mirror the contract paths:
// - CRM → Bracknet:   POST /api/call/start | /api/call/hangup | /api/call/transfer
// - Bracknet → CRM:   POST /api/webhook/bracknet/*

@Controller('call')
export class BracknetCallContractController {
  constructor(private readonly telephonyService: TelephonyService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async start(
    @Body()
    body: {
      agent_extension?: string;
      agent_id?: string;
      customer_number: string;
      caller_id?: string;
      call_type?: string;
      crm_call_id?: string;
    },
  ) {
    // If crm_call_id is numeric, treat it as taskId to link to crm_call_tasks.
    const maybeTaskId = body?.crm_call_id && /^\d+$/.test(String(body.crm_call_id)) ? Number(body.crm_call_id) : undefined;
    return this.telephonyService.bracknetStartCall({
      ...body,
      taskId: maybeTaskId,
    });
  }

  @Post('hangup')
  @UseGuards(JwtAuthGuard)
  async hangup(@Body() body: { bracknet_call_id: string }) {
    return this.telephonyService.bracknetHangup(body);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  async transfer(@Body() body: { bracknet_call_id: string; transfer_extension: string }) {
    return this.telephonyService.bracknetTransfer(body);
  }
}

@Controller('webhook/bracknet')
export class BracknetWebhookContractController {
  constructor(private readonly telephonyService: TelephonyService) {}

  @Post('incoming-call')
  async incomingCall(@Body() body: any, @Headers() headers: any) {
    return this.telephonyService.handleBracknetEvent('incoming_call', body);
  }

  @Post('call-answered')
  async callAnswered(@Body() body: any, @Headers() headers: any) {
    return this.telephonyService.handleBracknetEvent('call_answered', body);
  }

  @Post('call-ended')
  async callEnded(@Body() body: any, @Headers() headers: any) {
    return this.telephonyService.handleBracknetEvent('call_ended', body);
  }

  @Post('call-recording')
  async callRecording(@Body() body: any, @Headers() headers: any) {
    return this.telephonyService.handleBracknetEvent('call_recording_ready', body);
  }

  @Post('call-missed')
  async callMissed(@Body() body: any, @Headers() headers: any) {
    return this.telephonyService.handleBracknetEvent('call_missed', body);
  }
}
