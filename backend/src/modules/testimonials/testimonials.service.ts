import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './testimonial.entity';

@Injectable()
export class TestimonialsService {
  constructor(
    @InjectRepository(Testimonial)
    private readonly testimonialRepo: Repository<Testimonial>,
  ) {}

  findAll(approvedOnly: boolean): Promise<Testimonial[]> {
    return this.testimonialRepo.find({
      where: approvedOnly ? { is_approved: true } : {},
      order: { sort_order: 'ASC', created_at: 'DESC' },
    });
  }

  async create(data: Partial<Testimonial>): Promise<Testimonial> {
    if (!data.customer_name?.trim()) throw new BadRequestException('Customer name is required');
    if (!data.text?.trim()) throw new BadRequestException('Testimonial text is required');
    const rating = Math.min(5, Math.max(1, Number(data.rating) || 5));
    const testimonial = this.testimonialRepo.create({ ...data, rating });
    return this.testimonialRepo.save(testimonial);
  }

  async update(id: number, data: Partial<Testimonial>): Promise<Testimonial> {
    const testimonial = await this.testimonialRepo.findOne({ where: { id } });
    if (!testimonial) throw new NotFoundException(`Testimonial ${id} not found`);
    const { id: _id, ...rest } = data as any;
    if (rest.rating !== undefined) rest.rating = Math.min(5, Math.max(1, Number(rest.rating) || 5));
    Object.assign(testimonial, rest);
    return this.testimonialRepo.save(testimonial);
  }

  async remove(id: number): Promise<void> {
    const testimonial = await this.testimonialRepo.findOne({ where: { id } });
    if (!testimonial) throw new NotFoundException(`Testimonial ${id} not found`);
    await this.testimonialRepo.remove(testimonial);
  }
}
