import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrmReferralsService } from './crm-referrals.service';

@Controller('crm/referrals')
@UseGuards(JwtAuthGuard)
export class CrmReferralsController {
  constructor(private readonly crmReferralsService: CrmReferralsService) {}

  @Post('agent')
  async createAgentReferral(
    @Body() body: {
      referrerCustomerId: number;
      referredPhone?: string;
      referredEmail?: string;
      notes?: string;
      campaignId?: string;
      partnerId?: string;
    },
    @Request() req: any,
  ) {
    return await this.crmReferralsService.createAgentReferral({
      agentUserId: Number(req.user.id),
      referrerCustomerId: body.referrerCustomerId,
      referredPhone: body.referredPhone,
      referredEmail: body.referredEmail,
      notes: body.notes,
      campaignId: body.campaignId,
      partnerId: body.partnerId,
    });
  }

  @Get('my')
  async listMyReferrals(@Request() req: any, @Query('limit') limit?: string) {
    return await this.crmReferralsService.listMyAgentReferrals({
      agentUserId: Number(req.user.id),
      limit: limit != null ? Number(limit) : undefined,
    });
  }
}
