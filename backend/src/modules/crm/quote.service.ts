import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { QuoteTemplateService } from './quote-template.service';

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    private quoteTemplateService: QuoteTemplateService,
  ) {}

  async create(data: Partial<Quote>): Promise<Quote> {
    // Generate quote number
    const count = await this.quoteRepository.count();
    data.quoteNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const quote = this.quoteRepository.create(data);
    return await this.quoteRepository.save(quote);
  }

  async findAll(filters?: any): Promise<Quote[]> {
    const query = this.quoteRepository.createQueryBuilder('quote')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.deal', 'deal')
      .leftJoinAndSelect('quote.creator', 'creator')
      .leftJoinAndSelect('quote.template', 'template');

    if (filters?.customerId) {
      query.andWhere('quote.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.dealId) {
      query.andWhere('quote.dealId = :dealId', { dealId: filters.dealId });
    }

    if (filters?.status) {
      query.andWhere('quote.status = :status', { status: filters.status });
    }

    query.orderBy('quote.createdAt', 'DESC');

    return await query.getMany();
  }

  async findOne(id: number): Promise<Quote | null> {
    return await this.quoteRepository.findOne({
      where: { id },
      relations: ['customer', 'deal', 'creator', 'template', 'approver'],
    });
  }

  async findByNumber(quoteNumber: string): Promise<Quote | null> {
    return await this.quoteRepository.findOne({
      where: { quoteNumber },
      relations: ['customer', 'deal', 'creator', 'template'],
    });
  }

  async update(id: number, data: Partial<Quote>): Promise<Quote | null> {
    await this.quoteRepository.update(id, data);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.quoteRepository.delete(id);
  }

  async markAsSent(id: number): Promise<Quote | null> {
    return await this.update(id, {
      status: 'sent',
      sentAt: new Date(),
    });
  }

  async markAsViewed(id: number): Promise<Quote | null> {
    const quote = await this.findOne(id);
    if (quote && !quote.viewedAt) {
      return await this.update(id, {
        viewedAt: new Date(),
      });
    }
    return quote;
  }

  async markAsAccepted(id: number): Promise<Quote | null> {
    return await this.update(id, {
      status: 'accepted',
      acceptedAt: new Date(),
    });
  }

  async markAsRejected(id: number): Promise<Quote | null> {
    return await this.update(id, {
      status: 'rejected',
    });
  }

  // Phase 1: PDF Generation
  async generatePDF(id: number): Promise<Quote | null> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new Error('Quote not found');
    }

    const pdfUrl = await this.quoteTemplateService.generateQuotePDF(quote, quote.templateId);
    return await this.update(id, { pdfUrl });
  }

  // Phase 1: Quote Versioning
  async createNewVersion(id: number, changes: Partial<Quote>): Promise<Quote> {
    const originalQuote = await this.findOne(id);
    if (!originalQuote) {
      throw new Error('Quote not found');
    }

    const newVersion = await this.create({
      ...changes,
      parentQuoteId: id,
      version: originalQuote.version + 1,
      customerId: originalQuote.customerId,
      dealId: originalQuote.dealId,
      createdBy: changes.createdBy || originalQuote.createdBy,
      status: 'draft'
    });

    return newVersion;
  }

  async getQuoteVersions(id: number): Promise<Quote[]> {
    const quote = await this.findOne(id);
    if (!quote) {
      throw new Error('Quote not found');
    }

    // Get parent quote ID (either this quote or its parent)
    const parentId = quote.parentQuoteId || id;

    return await this.quoteRepository.find({
      where: [
        { id: parentId },
        { parentQuoteId: parentId }
      ],
      relations: ['creator'],
      order: { version: 'ASC' }
    });
  }

  // Phase 1: Approval Workflow
  async requestApproval(id: number): Promise<Quote | null> {
    return await this.update(id, {
      approvalStatus: 'pending'
    });
  }

  async approveQuote(id: number, approverId: number): Promise<Quote | null> {
    return await this.update(id, {
      approvalStatus: 'approved',
      approvedBy: approverId,
      approvedAt: new Date()
    });
  }

  async rejectQuote(id: number, approverId: number): Promise<Quote | null> {
    return await this.update(id, {
      approvalStatus: 'rejected',
      approvedBy: approverId,
      approvedAt: new Date()
    });
  }

  async getPendingApprovals(): Promise<Quote[]> {
    return await this.quoteRepository.find({
      where: { approvalStatus: 'pending' },
      relations: ['customer', 'creator', 'deal'],
      order: { createdAt: 'ASC' }
    });
  }
}
