import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LpExperiment } from './lp-experiment.entity';
import { LandingPage } from '../landing-pages/landing-page.entity';
import { SalesOrder } from '../sales/sales-order.entity';

const EXCLUDED_ORDER_STATUSES = ['cancelled', 'admin_cancelled'];

export interface VariantStats {
  page_id: number;
  title: string;
  slug: string;
  views: number;
  orders: number;
  revenue: number;
  cvr: number | null; // orders / views
}

@Injectable()
export class ExperimentsService {
  constructor(
    @InjectRepository(LpExperiment)
    private readonly experimentRepo: Repository<LpExperiment>,
    @InjectRepository(LandingPage)
    private readonly landingPageRepo: Repository<LandingPage>,
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepo: Repository<SalesOrder>,
  ) {}

  // ─── Admin CRUD & lifecycle ──────────────────────────────

  async findAll() {
    const experiments = await this.experimentRepo.find({ order: { created_at: 'DESC' } });
    const pageIds = [
      ...new Set(experiments.flatMap((e) => [e.variant_a_page_id, e.variant_b_page_id])),
    ];
    const pages = pageIds.length
      ? await this.landingPageRepo.find({
          where: { id: In(pageIds) },
          select: ['id', 'title', 'slug'] as any,
        })
      : [];
    const byId = new Map(pages.map((p) => [p.id, p]));
    return experiments.map((e) => ({
      ...e,
      variant_a: byId.get(e.variant_a_page_id) || null,
      variant_b: byId.get(e.variant_b_page_id) || null,
    }));
  }

  async create(data: Partial<LpExperiment>): Promise<LpExperiment> {
    const aId = Number(data.variant_a_page_id);
    const bId = Number(data.variant_b_page_id);
    if (!data.name?.trim()) throw new BadRequestException('Give the experiment a name');
    if (!aId || !bId) throw new BadRequestException('Pick both variant pages');
    if (aId === bId) throw new BadRequestException('Variants must be two different pages');

    const pages = await this.landingPageRepo.find({ where: { id: In([aId, bId]) } });
    if (pages.length !== 2) throw new NotFoundException('One of the variant pages does not exist');

    const split = Math.min(90, Math.max(10, Number(data.traffic_split) || 50));

    // One running/draft experiment per primary page keeps serving unambiguous
    const clash = await this.experimentRepo.findOne({
      where: [
        { variant_a_page_id: aId, status: 'running' },
        { variant_a_page_id: aId, status: 'draft' },
      ],
    });
    if (clash) {
      throw new ConflictException('That primary page already has an active or draft experiment');
    }

    const experiment = this.experimentRepo.create({
      name: data.name.trim(),
      status: 'draft',
      variant_a_page_id: aId,
      variant_b_page_id: bId,
      traffic_split: split,
      notes: data.notes || null as any,
    });
    return this.experimentRepo.save(experiment);
  }

  async update(id: number, data: Partial<LpExperiment>): Promise<LpExperiment> {
    const experiment = await this.findOne(id);
    if (experiment.status !== 'draft') {
      throw new BadRequestException('Only draft experiments can be edited');
    }
    if (data.name !== undefined) experiment.name = String(data.name).trim();
    if (data.traffic_split !== undefined) {
      experiment.traffic_split = Math.min(90, Math.max(10, Number(data.traffic_split) || 50));
    }
    if (data.notes !== undefined) experiment.notes = data.notes as any;
    return this.experimentRepo.save(experiment);
  }

  async findOne(id: number): Promise<LpExperiment> {
    const experiment = await this.experimentRepo.findOne({ where: { id } });
    if (!experiment) throw new NotFoundException(`Experiment ${id} not found`);
    return experiment;
  }

  async start(id: number): Promise<LpExperiment> {
    const experiment = await this.findOne(id);
    if (experiment.status !== 'draft') {
      throw new BadRequestException('Only a draft experiment can be started');
    }
    experiment.status = 'running';
    experiment.started_at = new Date();
    experiment.a_views = 0;
    experiment.b_views = 0;
    return this.experimentRepo.save(experiment);
  }

  /**
   * Complete the experiment. With promote=true and B as winner, the two
   * pages swap slugs atomically so the winning layout takes over the
   * public URL the ads point at.
   */
  async complete(id: number, winnerPageId: number, promote: boolean): Promise<LpExperiment> {
    const experiment = await this.findOne(id);
    if (experiment.status !== 'running') {
      throw new BadRequestException('Only a running experiment can be completed');
    }
    if (![experiment.variant_a_page_id, experiment.variant_b_page_id].includes(winnerPageId)) {
      throw new BadRequestException('Winner must be one of the two variants');
    }

    if (promote && winnerPageId === experiment.variant_b_page_id) {
      await this.experimentRepo.manager.transaction(async (em) => {
        const a = await em.findOneByOrFail(LandingPage, { id: experiment.variant_a_page_id });
        const b = await em.findOneByOrFail(LandingPage, { id: experiment.variant_b_page_id });
        const aSlug = a.slug;
        // Three-step swap to dodge the unique constraint
        await em.update(LandingPage, a.id, { slug: `${aSlug}__swap_tmp` });
        await em.update(LandingPage, b.id, { slug: aSlug });
        await em.update(LandingPage, a.id, { slug: b.slug });
      });
    }

    experiment.status = 'completed';
    experiment.ended_at = new Date();
    experiment.winner_page_id = winnerPageId;
    return this.experimentRepo.save(experiment);
  }

  async remove(id: number): Promise<void> {
    const experiment = await this.findOne(id);
    if (experiment.status === 'running') {
      throw new BadRequestException('Stop the experiment before deleting it');
    }
    await this.experimentRepo.remove(experiment);
  }

  // ─── Stats ───────────────────────────────────────────────

  async stats(id: number) {
    const experiment = await this.findOne(id);
    const pages = await this.landingPageRepo.find({
      where: { id: In([experiment.variant_a_page_id, experiment.variant_b_page_id]) },
    });
    const byId = new Map(pages.map((p) => [p.id, p]));
    const pageA = byId.get(experiment.variant_a_page_id);
    const pageB = byId.get(experiment.variant_b_page_id);
    if (!pageA || !pageB) throw new NotFoundException('Variant pages no longer exist');

    const from = experiment.started_at;
    const to = experiment.ended_at || new Date();

    const [salesA, salesB] = await Promise.all([
      this.variantSales(pageA.slug, from, to),
      this.variantSales(pageB.slug, from, to),
    ]);

    const a: VariantStats = {
      page_id: pageA.id,
      title: pageA.title,
      slug: pageA.slug,
      views: experiment.a_views,
      orders: salesA.orders,
      revenue: salesA.revenue,
      cvr: experiment.a_views > 0 ? salesA.orders / experiment.a_views : null,
    };
    const b: VariantStats = {
      page_id: pageB.id,
      title: pageB.title,
      slug: pageB.slug,
      views: experiment.b_views,
      orders: salesB.orders,
      revenue: salesB.revenue,
      cvr: experiment.b_views > 0 ? salesB.orders / experiment.b_views : null,
    };

    return {
      experiment,
      a,
      b,
      uplift: a.cvr && b.cvr != null ? (b.cvr - a.cvr) / a.cvr : null,
      significance: this.twoProportionTest(a.views, a.orders, b.views, b.orders),
    };
  }

  private async variantSales(slug: string, from: Date | null, to: Date) {
    if (!from) return { orders: 0, revenue: 0 };
    const row = await this.salesOrderRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.total_amount), 0)', 'revenue')
      .where('o.utm_source = :slug', { slug })
      .andWhere('o.created_at BETWEEN :from AND :to', { from, to })
      .andWhere('o.status NOT IN (:...excluded)', { excluded: EXCLUDED_ORDER_STATUSES })
      .getRawOne();
    return { orders: Number(row?.orders || 0), revenue: Number(row?.revenue || 0) };
  }

  /** Two-proportion z-test (conversion A vs B). */
  private twoProportionTest(vA: number, oA: number, vB: number, oB: number) {
    if (vA < 30 || vB < 30 || (oA === 0 && oB === 0)) {
      return { z: null, p_value: null, significant: false, note: 'Not enough data yet' };
    }
    const pA = oA / vA;
    const pB = oB / vB;
    const pooled = (oA + oB) / (vA + vB);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / vA + 1 / vB));
    if (se === 0) return { z: null, p_value: null, significant: false, note: 'No variance' };
    const z = (pB - pA) / se;
    const pValue = 2 * (1 - this.normalCdf(Math.abs(z)));
    return {
      z: Number(z.toFixed(3)),
      p_value: Number(pValue.toFixed(4)),
      significant: pValue < 0.05,
      note: pValue < 0.05 ? 'Statistically significant (95%)' : 'Not significant yet',
    };
  }

  private normalCdf(x: number) {
    // Abramowitz & Stegun 7.1.26 approximation of erf
    const t = 1 / (1 + 0.3275911 * (x / Math.SQRT2));
    const erf =
      1 -
      (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
        t *
        Math.exp(-(x * x) / 2);
    return 0.5 * (1 + erf);
  }

  // ─── Public (visitor-facing) ─────────────────────────────

  /** Running experiment whose primary (variant A) page has this slug. */
  async publicForSlug(slug: string) {
    const row = await this.experimentRepo
      .createQueryBuilder('e')
      .innerJoin(LandingPage, 'a', 'a.id = e.variant_a_page_id')
      .where('e.status = :status', { status: 'running' })
      .andWhere('a.slug = :slug', { slug })
      .select(['e.id AS id', 'e.traffic_split AS traffic_split', 'e.variant_a_page_id AS variant_a_page_id', 'e.variant_b_page_id AS variant_b_page_id'])
      .getRawOne();
    if (!row) return null;
    return {
      id: Number(row.id),
      traffic_split: Number(row.traffic_split),
      variant_a_page_id: Number(row.variant_a_page_id),
      variant_b_page_id: Number(row.variant_b_page_id),
    };
  }

  async trackView(id: number, variant: 'a' | 'b'): Promise<void> {
    const column = variant === 'b' ? 'b_views' : 'a_views';
    await this.experimentRepo
      .createQueryBuilder()
      .update(LpExperiment)
      .set({ [column]: () => `${column} + 1` } as any)
      .where('id = :id AND status = :status', { id, status: 'running' })
      .execute();
  }
}
