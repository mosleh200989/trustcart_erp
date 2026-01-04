import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TelephonyService } from './telephony.service';

@Controller('telephony')
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

  @Post('calls/initiate')
  @UseGuards(JwtAuthGuard)
  async initiateCall(@Body() body: { taskId: number; agentUserId?: number; agentPhone?: string }) {
    return this.telephonyService.initiateCall({
      taskId: Number(body.taskId),
      agentUserId: body.agentUserId != null ? Number(body.agentUserId) : undefined,
      agentPhone: body.agentPhone,
    });
  }

  // Webhook endpoint for Bracknet to send call events/status updates
  @Post('webhook/bracknet')
  async bracknetWebhook(@Body() body: any, @Headers() headers: any) {
    return this.telephonyService.handleBracknetWebhook(body, headers);
  }
}
