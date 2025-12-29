import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepository: Repository<EmailTemplate>,
  ) {}

  async getAllTemplates(category?: string) {
    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }
    return this.templateRepository.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async getTemplateById(id: number) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async createTemplate(data: Partial<EmailTemplate>, createdBy?: number) {
    const template = this.templateRepository.create({
      ...data,
      createdBy: createdBy,
    });
    return this.templateRepository.save(template);
  }

  async updateTemplate(id: number, data: Partial<EmailTemplate>) {
    await this.templateRepository.update(id, data);
    return this.getTemplateById(id);
  }

  async deleteTemplate(id: number) {
    const template = await this.getTemplateById(id);
    template.isActive = false;
    return this.templateRepository.save(template);
  }

  async renderTemplate(templateId: number, variables: Record<string, any>) {
    const template = await this.getTemplateById(templateId);

    // Compile and render subject
    const subjectTemplate = Handlebars.compile(template.subject);
    const subject = subjectTemplate(variables);

    // Compile and render body
    const bodyTemplate = Handlebars.compile(template.body);
    const body = bodyTemplate(variables);

    let htmlBody = null;
    if (template.htmlBody) {
      const htmlTemplate = Handlebars.compile(template.htmlBody);
      htmlBody = htmlTemplate(variables);
    }

    // Increment usage count
    await this.templateRepository.increment({ id: templateId }, 'usageCount', 1);

    return {
      subject,
      body,
      htmlBody
    };
  }

  async duplicateTemplate(templateId: number, createdBy?: number) {
    const original = await this.getTemplateById(templateId);
    
    const duplicate = this.templateRepository.create({
      ...original,
      id: undefined,
      name: `${original.name} (Copy)`,
      createdBy: createdBy,
      createdAt: undefined,
      updatedAt: undefined,
      usageCount: 0
    });

    return this.templateRepository.save(duplicate);
  }

  async getTemplatesByCategory() {
    const templates = await this.getAllTemplates();
    
    const grouped = templates.reduce((acc, template) => {
      const category = template.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, EmailTemplate[]>);

    return grouped;
  }

  async getMostUsedTemplates(limit: number = 10) {
    return this.templateRepository.find({
      where: { isActive: true },
      order: { usageCount: 'DESC' },
      take: limit
    });
  }
}
