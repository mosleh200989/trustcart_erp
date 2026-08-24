import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as dns } from 'dns';
import { StorefrontDomain } from './storefront-domain.entity';
import { Storefront } from './storefront.entity';
import { LandingPage } from '../landing-pages/landing-page.entity';

export interface PublicDomainMapEntry {
  domain: string;
  target_type: 'storefront' | 'landing_page';
  slug: string | null;      // landing page slug (landing_page targets)
  template: string | null;  // storefront template (storefront targets)
}

@Injectable()
export class StorefrontDomainsService {
  constructor(
    @InjectRepository(StorefrontDomain)
    private readonly domainRepo: Repository<StorefrontDomain>,
    @InjectRepository(Storefront)
    private readonly storefrontRepo: Repository<Storefront>,
    @InjectRepository(LandingPage)
    private readonly landingPageRepo: Repository<LandingPage>,
  ) {}

  private normalizeDomain(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '');
  }

  /** Admin list with resolved target names for display. */
  async findAll() {
    const [rows, storefronts, pages] = await Promise.all([
      this.domainRepo.find({ order: { domain: 'ASC' } }),
      this.storefrontRepo.find(),
      this.landingPageRepo.find({ select: ['id', 'title', 'slug', 'template'] as any }),
    ]);
    const sfById = new Map(storefronts.map((s) => [s.id, s]));
    const lpById = new Map(pages.map((p) => [p.id, p]));

    return rows.map((row) => ({
      ...row,
      target_name:
        row.target_type === 'storefront'
          ? sfById.get(row.storefront_id!)?.name || `Storefront #${row.storefront_id}`
          : lpById.get(row.landing_page_id!)?.title || `Landing page #${row.landing_page_id}`,
      target_slug:
        row.target_type === 'storefront'
          ? sfById.get(row.storefront_id!)?.slug || null
          : lpById.get(row.landing_page_id!)?.slug || null,
    }));
  }

  async create(data: Partial<StorefrontDomain>): Promise<StorefrontDomain> {
    const domain = this.normalizeDomain(data.domain || '');
    if (!domain || !domain.includes('.')) {
      throw new BadRequestException('Enter a valid domain, e.g. example.com');
    }
    const existing = await this.domainRepo.findOne({ where: { domain } });
    if (existing) throw new ConflictException(`"${domain}" is already mapped`);

    if (data.target_type === 'storefront') {
      if (!data.storefront_id) throw new BadRequestException('Pick a storefront');
      const sf = await this.storefrontRepo.findOne({ where: { id: data.storefront_id } });
      if (!sf) throw new NotFoundException(`Storefront ${data.storefront_id} not found`);
      data.landing_page_id = null;
    } else if (data.target_type === 'landing_page') {
      if (!data.landing_page_id) throw new BadRequestException('Pick a landing page');
      const lp = await this.landingPageRepo.findOne({ where: { id: data.landing_page_id } });
      if (!lp) throw new NotFoundException(`Landing page ${data.landing_page_id} not found`);
      data.storefront_id = null;
    } else {
      throw new BadRequestException('target_type must be storefront or landing_page');
    }

    const row = this.domainRepo.create({ ...data, domain });
    return this.domainRepo.save(row);
  }

  async update(id: number, data: Partial<StorefrontDomain>): Promise<StorefrontDomain> {
    const row = await this.domainRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Domain mapping ${id} not found`);
    // Domain itself is immutable — delete and recreate to change it.
    const { domain: _d, id: _id, ...rest } = data as any;
    Object.assign(row, rest);
    return this.domainRepo.save(row);
  }

  async remove(id: number): Promise<void> {
    const row = await this.domainRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Domain mapping ${id} not found`);
    await this.domainRepo.remove(row);
  }

  /**
   * DNS reality check: does the domain actually point at this server?
   * Expected IP comes from SERVER_PUBLIC_IP (optional).
   */
  async dnsCheck(id: number) {
    const row = await this.domainRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Domain mapping ${id} not found`);

    const expected = String(process.env.SERVER_PUBLIC_IP || '').trim() || null;
    try {
      const addresses = await dns.resolve4(row.domain);
      return {
        domain: row.domain,
        addresses,
        expected,
        ok: expected ? addresses.includes(expected) : null,
      };
    } catch (err: any) {
      return {
        domain: row.domain,
        addresses: [],
        expected,
        ok: false,
        error: err?.code || 'DNS lookup failed',
      };
    }
  }

  /** Public, cache-friendly map consumed by the Next.js middleware. */
  async publicMap(): Promise<PublicDomainMapEntry[]> {
    const rows = await this.domainRepo
      .createQueryBuilder('d')
      .leftJoin(Storefront, 's', 's.id = d.storefront_id')
      .leftJoin(LandingPage, 'lp', 'lp.id = d.landing_page_id')
      .select([
        'd.domain AS domain',
        'd.target_type AS target_type',
        'lp.slug AS slug',
        's.template AS template',
        's.is_active AS storefront_active',
        'lp.is_active AS page_active',
      ])
      .where('d.is_active = true')
      .getRawMany();

    return rows
      .filter((r) =>
        r.target_type === 'storefront' ? r.storefront_active !== false : r.page_active !== false,
      )
      .map((r) => ({
        domain: r.domain,
        target_type: r.target_type,
        slug: r.slug || null,
        template: r.template || null,
      }));
  }
}
