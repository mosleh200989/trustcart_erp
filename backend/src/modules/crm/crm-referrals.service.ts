import { Injectable } from '@nestjs/common';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { TaskService } from './task.service';

@Injectable()
export class CrmReferralsService {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly taskService: TaskService,
  ) {}

  async createAgentReferral(input: {
    agentUserId: number;
    referrerCustomerId: number;
    referredPhone?: string;
    referredEmail?: string;
    notes?: string;
    campaignId?: string;
    partnerId?: string;
  }) {
    const referral = await this.loyaltyService.createAgentReferral({
      agentUserId: input.agentUserId,
      referrerCustomerId: input.referrerCustomerId,
      referredPhone: input.referredPhone,
      referredEmail: input.referredEmail,
      notes: input.notes,
      campaignId: input.campaignId,
      partnerId: input.partnerId,
    });

    const identity = input.referredPhone || input.referredEmail || `Referral #${referral.id}`;

    const task = await this.taskService.create({
      title: `Referral follow-up: ${identity}`,
      description:
        `Referral created by agent user #${input.agentUserId}.\n` +
        `Referrer customer: #${input.referrerCustomerId}\n` +
        `Referral code: ${(referral as any).referralCode ?? ''}\n` +
        (input.notes ? `Notes: ${String(input.notes)}\n` : ''),
      assignedTo: input.agentUserId,
      assignedBy: input.agentUserId,
      customerId: input.referrerCustomerId,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      priority: 'medium',
      status: 'pending',
      tags: ['referral', 'agent_referral'],
      category: 'referral',
    } as any);

    return { referral, task };
  }

  async listMyAgentReferrals(input: { agentUserId: number; limit?: number }) {
    return await this.loyaltyService.listAgentReferrals(input.agentUserId, input.limit ?? 100);
  }
}
