import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ActivityTemplateService } from './activity-template.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('crm/activity-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ActivityTemplateController {
  constructor(private readonly activityTemplateService: ActivityTemplateService) {}

  @Get()
  getAllTemplates(@Query('type') activityType?: string) {
    return this.activityTemplateService.getAllTemplates(activityType);
  }

  @Get('shared')
  getSharedTemplates() {
    return this.activityTemplateService.getSharedTemplates();
  }

  @Get(':id')
  getTemplateById(@Param('id') id: number) {
    return this.activityTemplateService.getTemplateById(id);
  }

  @Post()
  async createTemplate(@Body() data: any, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.activityTemplateService.createTemplate(data, userId);
    } catch (error) {
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put(':id')
  updateTemplate(@Param('id') id: number, @Body() data: any) {
    return this.activityTemplateService.updateTemplate(id, data);
  }

  @Delete(':id')
  deleteTemplate(@Param('id') id: number) {
    return this.activityTemplateService.deleteTemplate(id);
  }

  @Post(':id/render')
  renderTemplate(@Param('id') id: number, @Body('variables') variables: any) {
    return this.activityTemplateService.renderTemplate(id, variables);
  }
}
