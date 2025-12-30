import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { CustomerSegment } from './entities/customer-segment.entity';
import { SegmentMember } from './entities/segment-member.entity';
import { Customer } from '../customers/customer.entity';

@Injectable()
export class SegmentationService {
  constructor(
    @InjectRepository(CustomerSegment)
    private segmentRepository: Repository<CustomerSegment>,
    @InjectRepository(SegmentMember)
    private memberRepository: Repository<SegmentMember>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async getAllSegments() {
    return this.segmentRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  async getSegmentById(id: number) {
    const segment = await this.segmentRepository.findOne({ where: { id } });
    if (!segment) throw new NotFoundException('Segment not found');
    return segment;
  }

  async createSegment(data: Partial<CustomerSegment>, createdBy?: number) {
    const segment = this.segmentRepository.create({
      ...data,
      createdBy: createdBy,
    });
    return this.segmentRepository.save(segment);
  }

  async updateSegment(id: number, data: Partial<CustomerSegment>) {
    await this.segmentRepository.update(id, data);
    return this.getSegmentById(id);
  }

  async deleteSegment(id: number) {
    const segment = await this.getSegmentById(id);
    segment.isActive = false;
    return this.segmentRepository.save(segment);
  }

  // Segment Members Management
  async getSegmentMembers(segmentId: number) {
    return this.memberRepository.find({
      where: { segmentId },
      relations: ['customer'],
      order: { addedAt: 'DESC' }
    });
  }

  async addMemberToSegment(segmentId: number, customerId: number) {
    const existing = await this.memberRepository.findOne({
      where: { segmentId, customerId }
    });

    if (existing) {
      return existing;
    }

    const member = this.memberRepository.create({ segmentId, customerId });
    const saved = await this.memberRepository.save(member);

    // Update customer count
    await this.updateCustomerCount(segmentId);

    return saved;
  }

  async removeMemberFromSegment(segmentId: number, customerId: number) {
    await this.memberRepository.delete({ segmentId, customerId });
    await this.updateCustomerCount(segmentId);
  }

  async bulkAddMembers(segmentId: number, customerIds: number[]) {
    const members = customerIds.map(customerId => 
      this.memberRepository.create({ segmentId, customerId })
    );
    await this.memberRepository.save(members);
    await this.updateCustomerCount(segmentId);
  }

  async bulkRemoveMembers(segmentId: number, customerIds: number[]) {
    await this.memberRepository.delete({
      segmentId,
      customerId: In(customerIds)
    });
    await this.updateCustomerCount(segmentId);
  }

  // Dynamic Segment Calculation
  async calculateDynamicSegment(segmentId: number) {
    const segment = await this.getSegmentById(segmentId);
    
    if (segment.segmentType !== 'dynamic') {
      throw new Error('Segment is not dynamic');
    }

    const criteria = segment.criteria;
    let query = this.customerRepository.createQueryBuilder('customer');

    // Apply criteria filters
    if (criteria.location) {
      query = query.andWhere('customer.location ILIKE :location', { 
        location: `%${criteria.location}%` 
      });
    }

    if (criteria.minOrderValue) {
      query = query.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('SUM(order.total_amount)')
          .from('orders', 'order')
          .where('order.customer_id = customer.id')
          .getQuery();
        return `(${subQuery}) >= :minOrderValue`;
      }).setParameter('minOrderValue', criteria.minOrderValue);
    }

    if (criteria.minOrderCount) {
      query = query.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('COUNT(*)')
          .from('orders', 'order')
          .where('order.customer_id = customer.id')
          .getQuery();
        return `(${subQuery}) >= :minOrderCount`;
      }).setParameter('minOrderCount', criteria.minOrderCount);
    }

    if (criteria.lastOrderDays) {
      query = query.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('MAX(order.created_at)')
          .from('orders', 'order')
          .where('order.customer_id = customer.id')
          .getQuery();
        return `(${subQuery}) >= NOW() - INTERVAL '${criteria.lastOrderDays} days'`;
      });
    }

    if (criteria.tier) {
      query = query.andWhere('customer.tier = :tier', { tier: criteria.tier });
    }

    if (criteria.tags && criteria.tags.length > 0) {
      query = query.andWhere('customer.tags ?| array[:...tags]', { tags: criteria.tags });
    }

    const customers = await query.getMany();

    // Clear existing members
    await this.memberRepository.delete({ segment: { id: segmentId } });

    // Add new members
    if (customers.length > 0) {
      const members = customers.map(customer => 
        this.memberRepository.create({ 
          segment: { id: segmentId },
          customer: { id: customer.id }
        })
      );
      await this.memberRepository.save(members);
    }

    // Update segment
    segment.customerCount = customers.length;
    segment.lastCalculatedAt = new Date();
    await this.segmentRepository.save(segment);

    return { segment, customerCount: customers.length };
  }

  // Helper methods
  private async updateCustomerCount(segmentId: number) {
    const count = await this.memberRepository.count({ where: { segmentId } });
    await this.segmentRepository.update(segmentId, { customerCount: count });
  }

  async getSegmentStats() {
    const segments = await this.getAllSegments();
    
    return {
      totalSegments: segments.length,
      dynamicSegments: segments.filter(s => s.segmentType === 'dynamic').length,
      manualSegments: segments.filter(s => s.segmentType === 'manual').length,
      totalCustomersInSegments: segments.reduce((sum, s) => sum + s.customerCount, 0)
    };
  }

  async searchCustomersForSegment(searchTerm: string, limit: number = 50) {
    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.name ILIKE :search OR customer.email ILIKE :search', {
        search: `%${searchTerm}%`
      })
      .limit(limit)
      .getMany();
  }
}
