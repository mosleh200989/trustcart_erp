import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from './support-ticket.entity';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketsRepository: Repository<SupportTicket>,
    private customersService: CustomersService,
  ) {}

  async findAll() {
    return this.ticketsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomerId(customerId: string) {
    return this.ticketsRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomerEmail(email: string) {
    return this.ticketsRepository.find({
      where: { customerEmail: email },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    return this.ticketsRepository.findOne({ where: { id } });
  }

  async create(dto: any) {
    const normalized = {
      ...dto,
      status: this.normalizeStatus(dto?.status) ?? 'open',
      priority: dto?.priority ? String(dto.priority).toLowerCase() : dto?.priority,
    };
    const ticket = this.ticketsRepository.create(normalized);
    return await this.ticketsRepository.save(ticket);
  }

  async update(id: number, dto: any) {
    const normalized = {
      ...dto,
      status: dto?.status ? this.normalizeStatus(dto.status) : dto?.status,
      priority: dto?.priority ? String(dto.priority).toLowerCase() : dto?.priority,
    };
    await this.ticketsRepository.update(id, normalized);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.ticketsRepository.delete(id);
    return { id, message: 'Support ticket deleted' };
  }

  async addReply(id: number, response: string, status?: string) {
    const updateData: any = {
      response,
      respondedAt: new Date(),
    };
    
    if (status) {
      updateData.status = this.normalizeStatus(status);
    }
    
    await this.ticketsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ticketsRepository.update(id, { status: this.normalizeStatus(status) });
    return this.findOne(id);
  }

  async updatePriority(id: number, priority: string) {
    await this.ticketsRepository.update(id, { priority: String(priority).toLowerCase() });
    return this.findOne(id);
  }

  async assignTicket(id: number, assignedTo: number | null) {
    await this.ticketsRepository.update(id, { assignedTo });
    return this.findOne(id);
  }

  private normalizeStatus(status: unknown): string {
    const raw = String(status || '').trim().toLowerCase();
    if (raw === 'in-progress') return 'in_progress';
    return raw;
  }
}
