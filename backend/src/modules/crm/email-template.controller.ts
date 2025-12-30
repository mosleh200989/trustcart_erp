import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('crm/email-templates')
@Public()
export class EmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Get()
  getAllTemplates(@Query('category') category?: string) {
    return this.emailTemplateService.getAllTemplates(category);
  }

  @Get('by-category')
  getTemplatesByCategory() {
    return this.emailTemplateService.getTemplatesByCategory();
  }

  @Get('most-used')
  getMostUsedTemplates(@Query('limit') limit?: number) {
    return this.emailTemplateService.getMostUsedTemplates(limit);
  }

  @Get(':id')
  getTemplateById(@Param('id') id: number) {
    return this.emailTemplateService.getTemplateById(id);
  }

  @Post()
  async createTemplate(@Body() data: any, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.emailTemplateService.createTemplate(data, userId);
    } catch (error) {
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put(':id')
  updateTemplate(@Param('id') id: number, @Body() data: any) {
    return this.emailTemplateService.updateTemplate(id, data);
  }

  @Delete(':id')
  deleteTemplate(@Param('id') id: number) {
    return this.emailTemplateService.deleteTemplate(id);
  }

  @Post(':id/render')
  renderTemplate(@Param('id') id: number, @Body('variables') variables: any) {
    return this.emailTemplateService.renderTemplate(id, variables);
  }

  @Post(':id/duplicate')
  async duplicateTemplate(@Param('id') id: number, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.emailTemplateService.duplicateTemplate(id, userId);
    } catch (error) {
      throw new Error(`Failed to duplicate template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
