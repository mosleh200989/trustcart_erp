import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandingPage } from './landing-page.entity';
import { LandingPageOrder } from './landing-page-order.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LandingPagesService {
  constructor(
    @InjectRepository(LandingPage)
    private landingPagesRepository: Repository<LandingPage>,
    @InjectRepository(LandingPageOrder)
    private ordersRepository: Repository<LandingPageOrder>,
  ) {}

  async findAll(): Promise<LandingPage[]> {
    return this.landingPagesRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findActive(): Promise<LandingPage[]> {
    const now = new Date();
    return this.landingPagesRepository
      .createQueryBuilder('lp')
      .where('lp.is_active = :isActive', { isActive: true })
      .andWhere('(lp.start_date IS NULL OR lp.start_date <= :now)', { now })
      .andWhere('(lp.end_date IS NULL OR lp.end_date >= :now)', { now })
      .orderBy('lp.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<LandingPage | null> {
    return this.landingPagesRepository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<LandingPage | null> {
    return this.landingPagesRepository.findOne({ where: { slug } });
  }

  async findActiveBySlug(slug: string): Promise<LandingPage | null> {
    const now = new Date();
    return this.landingPagesRepository
      .createQueryBuilder('lp')
      .where('lp.slug = :slug', { slug })
      .andWhere('lp.is_active = :isActive', { isActive: true })
      .andWhere('(lp.start_date IS NULL OR lp.start_date <= :now)', { now })
      .andWhere('(lp.end_date IS NULL OR lp.end_date >= :now)', { now })
      .getOne();
  }

  async create(data: Partial<LandingPage>): Promise<LandingPage> {
    const landingPage = this.landingPagesRepository.create({
      ...data,
      uuid: uuidv4(),
    });
    return this.landingPagesRepository.save(landingPage);
  }

  async update(id: number, data: Partial<LandingPage>): Promise<LandingPage> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Landing page with ID ${id} not found`);
    }
    await this.landingPagesRepository.update(id, data);
    return this.findOne(id) as Promise<LandingPage>;
  }

  async remove(id: number): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Landing page with ID ${id} not found`);
    }
    await this.landingPagesRepository.delete(id);
  }

  async toggleActive(id: number): Promise<LandingPage> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Landing page with ID ${id} not found`);
    }
    await this.landingPagesRepository.update(id, {
      is_active: !existing.is_active,
    });
    return this.findOne(id) as Promise<LandingPage>;
  }

  async incrementViewCount(id: number): Promise<void> {
    await this.landingPagesRepository
      .createQueryBuilder()
      .update(LandingPage)
      .set({ view_count: () => 'view_count + 1' })
      .where('id = :id', { id })
      .execute();
  }

  async incrementOrderCount(id: number): Promise<void> {
    await this.landingPagesRepository
      .createQueryBuilder()
      .update(LandingPage)
      .set({ order_count: () => 'order_count + 1' })
      .where('id = :id', { id })
      .execute();
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    totalViews: number;
    totalOrders: number;
  }> {
    const total = await this.landingPagesRepository.count();
    const active = await this.landingPagesRepository.count({
      where: { is_active: true },
    });
    const stats = await this.landingPagesRepository
      .createQueryBuilder('lp')
      .select('SUM(lp.view_count)', 'totalViews')
      .addSelect('SUM(lp.order_count)', 'totalOrders')
      .getRawOne();

    return {
      total,
      active,
      totalViews: parseInt(stats?.totalViews || '0', 10),
      totalOrders: parseInt(stats?.totalOrders || '0', 10),
    };
  }

  async duplicate(id: number): Promise<LandingPage> {
    const original = await this.findOne(id);
    if (!original) {
      throw new NotFoundException(`Landing page with ID ${id} not found`);
    }

    const { id: _, uuid: __, created_at, updated_at, slug, title, ...rest } = original as any;
    return this.create({
      ...rest,
      title: `${title} (Copy)`,
      slug: `${slug}-copy-${Date.now()}`,
      is_active: false,
      view_count: 0,
      order_count: 0,
    });
  }

  // ─── Order Methods ───

  async createOrder(data: Partial<LandingPageOrder>): Promise<LandingPageOrder> {
    const order = this.ordersRepository.create({
      ...data,
      uuid: uuidv4(),
    });
    const saved = await this.ordersRepository.save(order);

    // Also increment the landing page order count
    if (data.landing_page_id) {
      await this.incrementOrderCount(data.landing_page_id);
    }

    return saved;
  }

  async findAllOrders(filters?: {
    landing_page_id?: number;
    status?: string;
    search?: string;
  }): Promise<LandingPageOrder[]> {
    const qb = this.ordersRepository.createQueryBuilder('o');

    if (filters?.landing_page_id) {
      qb.andWhere('o.landing_page_id = :lpId', { lpId: filters.landing_page_id });
    }
    if (filters?.status) {
      qb.andWhere('o.status = :status', { status: filters.status });
    }
    if (filters?.search) {
      qb.andWhere(
        '(o.customer_name ILIKE :search OR o.customer_phone ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return qb.orderBy('o.created_at', 'DESC').getMany();
  }

  async findOneOrder(id: number): Promise<LandingPageOrder | null> {
    return this.ordersRepository.findOne({ where: { id } });
  }

  async updateOrderStatus(id: number, status: string, admin_note?: string): Promise<LandingPageOrder> {
    const order = await this.findOneOrder(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    const updateData: Partial<LandingPageOrder> = { status };
    if (admin_note !== undefined) {
      updateData.admin_note = admin_note;
    }
    await this.ordersRepository.update(id, updateData);
    return this.findOneOrder(id) as Promise<LandingPageOrder>;
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.findOneOrder(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    await this.ordersRepository.delete(id);
  }

  async getOrderStats(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
    totalRevenue: number;
  }> {
    const total = await this.ordersRepository.count();
    const pending = await this.ordersRepository.count({ where: { status: 'pending' } });
    const confirmed = await this.ordersRepository.count({ where: { status: 'confirmed' } });
    const delivered = await this.ordersRepository.count({ where: { status: 'delivered' } });
    const cancelled = await this.ordersRepository.count({ where: { status: 'cancelled' } });
    const revenueResult = await this.ordersRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total_amount), 0)', 'totalRevenue')
      .where('o.status NOT IN (:...excluded)', { excluded: ['cancelled', 'returned'] })
      .getRawOne();

    return {
      total,
      pending,
      confirmed,
      delivered,
      cancelled,
      totalRevenue: parseFloat(revenueResult?.totalRevenue || '0'),
    };
  }
}
