import { Controller, Get, Patch, Post, Param, UseGuards, Request } from '@nestjs/common';
import { CrmNotificationsService } from './crm-notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('crm/notifications')
export class CrmNotificationsController {
  constructor(private readonly notificationsService: CrmNotificationsService) {}

  /** GET /crm/notifications — returns the caller's notifications (last 50) */
  @Get()
  async getMyNotifications(@Request() req: any) {
    const userId = Number(req.user?.id ?? req.user?.userId);
    return this.notificationsService.getForUser(userId);
  }

  /** PATCH /crm/notifications/:id/read — mark a single notification as read */
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req: any) {
    const userId = Number(req.user?.id ?? req.user?.userId);
    await this.notificationsService.markRead(Number(id), userId);
    return { success: true };
  }

  /** POST /crm/notifications/mark-all-read — mark all of the caller's notifications read */
  @Post('mark-all-read')
  async markAllRead(@Request() req: any) {
    const userId = Number(req.user?.id ?? req.user?.userId);
    await this.notificationsService.markAllRead(userId);
    return { success: true };
  }
}
