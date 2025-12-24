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
    try {
      console.log('=== findByCustomerId SERVICE START ===');
      console.log('Customer ID:', customerId);
      console.log('Customer ID type:', typeof customerId);
      
      const tickets = await this.ticketsRepository.find({
        where: { customerId },
        order: { createdAt: 'DESC' },
      });
      
      console.log('Tickets found:', tickets.length);
      console.log('=== findByCustomerId SERVICE END ===');
      return tickets;
    } catch (error: any) {
      console.error('=== ERROR in findByCustomerId ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async findByCustomerEmail(email: string) {
    try {
      console.log('=== findByCustomerEmail SERVICE START ===');
      console.log('Email:', email);
      
      const tickets = await this.ticketsRepository.find({
        where: { customerEmail: email },
        order: { createdAt: 'DESC' },
      });
      
      console.log('Tickets found:', tickets.length);
      console.log('=== findByCustomerEmail SERVICE END ===');
      return tickets;
    } catch (error: any) {
      console.error('=== ERROR in findByCustomerEmail ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async findOne(id: number) {
    return this.ticketsRepository.findOne({ where: { id } });
  }

  async create(dto: any) {
    try {
      console.log('=== create SERVICE START ===');
      console.log('DTO:', JSON.stringify(dto));
      
      const ticket = this.ticketsRepository.create(dto);
      console.log('Ticket entity created:', JSON.stringify(ticket));
      
      const saved = await this.ticketsRepository.save(ticket);
      console.log('Ticket saved:', JSON.stringify(saved));
      console.log('=== create SERVICE END ===');
      
      return saved;
    } catch (error: any) {
      console.error('=== ERROR in create SERVICE ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('DTO was:', JSON.stringify(dto));
      throw error;
    }
  }

  async update(id: number, dto: any) {
    await this.ticketsRepository.update(id, dto);
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
      updateData.status = status;
    }
    
    await this.ticketsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ticketsRepository.update(id, { status });
    return this.findOne(id);
  }

  async updatePriority(id: number, priority: string) {
    await this.ticketsRepository.update(id, { priority });
    return this.findOne(id);
  }

  async assignTicket(id: number, assignedTo: number | null) {
    await this.ticketsRepository.update(id, { assignedTo });
    return this.findOne(id);
  }
}
