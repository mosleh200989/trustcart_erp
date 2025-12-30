import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { QuoteTemplateService } from './quote-template.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('crm/quote-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuoteTemplateController {
  constructor(private readonly quoteTemplateService: QuoteTemplateService) {}

  @Get()
  getAllTemplates() {
    return this.quoteTemplateService.getAllTemplates();
  }

  @Get('default')
  getDefaultTemplate() {
    return this.quoteTemplateService.getDefaultTemplate();
  }

  @Get(':id')
  getTemplateById(@Param('id') id: number) {
    return this.quoteTemplateService.getTemplateById(id);
  }

  @Post()
  async createTemplate(@Body() data: any, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.quoteTemplateService.createTemplate(data, userId);
    } catch (error) {
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put(':id')
  updateTemplate(@Param('id') id: number, @Body() data: any) {
    return this.quoteTemplateService.updateTemplate(id, data);
  }

  @Delete(':id')
  deleteTemplate(@Param('id') id: number) {
    return this.quoteTemplateService.deleteTemplate(id);
  }

  @Put(':id/set-default')
  setAsDefault(@Param('id') id: number) {
    return this.quoteTemplateService.setAsDefault(id);
  }

  @Post('generate-pdf')
  generateQuotePDF(
    @Body('quoteData') quoteData: any,
    @Body('templateId') templateId?: number
  ) {
    return this.quoteTemplateService.generateQuotePDF(quoteData, templateId);
  }
}
