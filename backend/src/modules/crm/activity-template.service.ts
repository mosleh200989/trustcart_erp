import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityTemplate } from './entities/activity-template.entity';

@Injectable()
export class ActivityTemplateService {
  constructor(
    @InjectRepository(ActivityTemplate)
    private templateRepository: Repository<ActivityTemplate>,
  ) {}

  async getAllTemplates(activityType?: string) {
    const where: any = {};
    if (activityType) {
      where.activityType = activityType;
    }
    return this.templateRepository.find({
      where,
      order: { name: 'ASC' }
    });
  }

  async getTemplateById(id: number) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Activity template not found');
    return template;
  }

  async createTemplate(data: Partial<ActivityTemplate>, createdBy?: number) {
    const template = this.templateRepository.create({
      ...data,
      createdBy: createdBy,
    });
    return this.templateRepository.save(template);
  }

  async updateTemplate(id: number, data: Partial<ActivityTemplate>) {
    await this.templateRepository.update(id, data);
    return this.getTemplateById(id);
  }

  async deleteTemplate(id: number) {
    await this.templateRepository.delete(id);
  }

  async getSharedTemplates() {
    return this.templateRepository.find({
      where: { isShared: true },
      order: { name: 'ASC' }
    });
  }

  async renderTemplate(templateId: number, variables: Record<string, any>) {
    const template = await this.getTemplateById(templateId);

    let subject = template.subjectTemplate || '';
    let description = template.descriptionTemplate || '';

    // Simple variable replacement
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, variables[key]);
      description = description.replace(regex, variables[key]);
    });

    return {
      activityType: template.activityType,
      subject,
      description,
      duration: template.duration
    };
  }
}
