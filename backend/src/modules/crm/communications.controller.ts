import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CommunicationsService } from './communications.service';

@Controller('crm/communications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Post('email')
  async sendEmail(@Body() dto: any, @Request() req: any) {
    return await this.communicationsService.sendEmail({
      customerId: dto.customerId,
      toAddress: dto.toAddress,
      subject: dto.subject,
      body: dto.body,
      ccAddresses: dto.ccAddresses,
      bccAddresses: dto.bccAddresses,
      templateId: dto.templateId,
      templateUsed: dto.templateUsed,
      variables: dto.variables,
      sentBy: req.user.id,
    });
  }

  @Post('sms')
  async sendSms(@Body() dto: any, @Request() req: any) {
    return await this.communicationsService.sendSms({
      customerId: dto.customerId,
      toNumber: dto.toNumber,
      message: dto.message,
      campaignId: dto.campaignId,
      sentBy: req.user.id,
    });
  }
}
