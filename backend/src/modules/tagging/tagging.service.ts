import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { CustomerTagAssignment } from './customer-tag-assignment.entity';
import { CustomerTag } from './customer-tag.entity';
import { AssignCustomersDto } from './dto/assign-customers.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { CreateCustomerTagDto } from './dto/create-customer-tag.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query.dto';
import { ListTagsQueryDto } from './dto/list-tags.query.dto';
import { UpdateCustomerTagDto } from './dto/update-customer-tag.dto';

const parseUuidCsv = (csv?: string): string[] => {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

@Injectable()
export class TaggingService {
  constructor(
    @InjectRepository(CustomerTag)
    private readonly tagsRepo: Repository<CustomerTag>,
    @InjectRepository(CustomerTagAssignment)
    private readonly assignmentsRepo: Repository<CustomerTagAssignment>,
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
  ) {}

  async listTags(query: ListTagsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const baseQb = this.tagsRepo.createQueryBuilder('t');

    if (query.search) {
      baseQb.andWhere('LOWER(t.name) LIKE :q OR LOWER(COALESCE(t.description, \'\')) LIKE :q', {
        q: `%${query.search.toLowerCase()}%`,
      });
    }

    const total = await baseQb.getCount();

    const qb = this.tagsRepo
      .createQueryBuilder('t')
      .leftJoin(CustomerTagAssignment, 'a', 'a.tag_id = t.id')
      .addSelect('COUNT(a.customer_id)', 'customersCount')
      .groupBy('t.id');

    if (query.search) {
      qb.andWhere('LOWER(t.name) LIKE :q OR LOWER(COALESCE(t.description, \'\')) LIKE :q', {
        q: `%${query.search.toLowerCase()}%`,
      });
    }

    const orderMap: Record<string, string> = {
      name: 't.name',
      createdAt: 't.createdAt',
    };
    qb.orderBy(orderMap[sortBy] ?? 't.createdAt', sortDir.toUpperCase() as 'ASC' | 'DESC');

    const rows = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawAndEntities();

    const countsById = new Map<string, number>();
    rows.raw.forEach((r: any) => {
      const id = r['t_id'];
      const cnt = Number(r['customersCount'] ?? 0);
      countsById.set(id, cnt);
    });

    const data = rows.entities.map((t) => ({
      ...t,
      customersCount: countsById.get(t.id) ?? 0,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getTag(id: string) {
    const tag = await this.tagsRepo.findOne({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    const customersCount = await this.assignmentsRepo.count({ where: { tagId: id } });
    return { ...tag, customersCount };
  }

  async createTag(dto: CreateCustomerTagDto) {
    try {
      const tag = this.tagsRepo.create({
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        color: dto.color?.trim() ?? null,
      });
      return await this.tagsRepo.save(tag);
    } catch (e: any) {
      if (String(e?.message ?? '').toLowerCase().includes('duplicate')) {
        throw new BadRequestException('Tag name already exists');
      }
      throw e;
    }
  }

  async updateTag(id: string, dto: UpdateCustomerTagDto) {
    const tag = await this.tagsRepo.findOne({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');

    if (dto.name !== undefined) tag.name = dto.name.trim();
    if (dto.description !== undefined) tag.description = dto.description?.trim() ?? null;
    if (dto.color !== undefined) tag.color = dto.color?.trim() ?? null;

    try {
      return await this.tagsRepo.save(tag);
    } catch (e: any) {
      if (String(e?.message ?? '').toLowerCase().includes('duplicate')) {
        throw new BadRequestException('Tag name already exists');
      }
      throw e;
    }
  }

  async deleteTag(id: string) {
    const tag = await this.tagsRepo.findOne({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.tagsRepo.remove(tag);
    return { success: true };
  }

  async bulkDelete(dto: BulkDeleteDto) {
    const existing = await this.tagsRepo.find({ where: { id: In(dto.ids) } });
    await this.tagsRepo.remove(existing);
    return { success: true, deleted: existing.length };
  }

  async assignCustomers(tagId: string, dto: AssignCustomersDto) {
    const tag = await this.tagsRepo.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');

    const customers = await this.customersRepo.find({
      where: { id: In(dto.customerIds) },
      select: ['id'],
    });
    const customerIds = customers.map((c) => c.id);
    if (customerIds.length === 0) throw new BadRequestException('No valid customers found');

    const existing = await this.assignmentsRepo.find({
      where: { tagId, customerId: In(customerIds) },
    });
    const existingSet = new Set(existing.map((a) => a.customerId));

    const toInsert = customerIds
      .filter((id) => !existingSet.has(id))
      .map((customerId) => this.assignmentsRepo.create({ tagId, customerId }));

    if (toInsert.length > 0) {
      await this.assignmentsRepo.save(toInsert);
    }

    return { success: true, added: toInsert.length, alreadyPresent: existing.length };
  }

  async removeCustomers(tagId: string, dto: AssignCustomersDto) {
    const tag = await this.tagsRepo.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');

    const assignments = await this.assignmentsRepo.find({
      where: { tagId, customerId: In(dto.customerIds) },
    });
    if (assignments.length > 0) await this.assignmentsRepo.remove(assignments);
    return { success: true, removed: assignments.length };
  }

  async listCustomers(query: ListCustomersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const tagIds = parseUuidCsv(query.tagIds);
    const mode = query.mode ?? 'any';

    const qb = this.customersRepo.createQueryBuilder('c');

    // Avoid returning deleted customers by default
    qb.where('c.is_deleted = false');

    if (search) {
      qb.andWhere(
        '(LOWER(COALESCE(c.name, \'\')) LIKE :q OR LOWER(COALESCE(c.email, \'\')) LIKE :q OR COALESCE(c.phone, \'\') LIKE :q)',
        { q: `%${search.toLowerCase()}%` },
      );
    }

    if (tagIds.length > 0) {
      if (mode === 'all') {
        qb.innerJoin(
          (subQb) =>
            subQb
              .from(CustomerTagAssignment, 'a')
              .select('a.customer_id', 'customer_id')
              .addSelect('COUNT(DISTINCT a.tag_id)', 'tag_cnt')
              .where('a.tag_id IN (:...tagIds)', { tagIds })
              .groupBy('a.customer_id')
              .having('COUNT(DISTINCT a.tag_id) = :needed', { needed: tagIds.length }),
          'm',
          'm.customer_id = c.id',
        );
      } else {
        qb.innerJoin(CustomerTagAssignment, 'a', 'a.customer_id = c.id AND a.tag_id IN (:...tagIds)', {
          tagIds,
        });
      }
    }

    qb.orderBy('c.createdAt', 'DESC');

    const total = await qb.getCount();
    const customers = await qb
      .select([
        'c.id',
        'c.name',
        'c.lastName',
        'c.email',
        'c.phone',
        'c.city',
        'c.district',
        'c.isGuest',
      ])
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();

    const customerIds = customers.map((c) => c.id);
    const tagsByCustomer = new Map<string, Array<{ id: string; name: string; color: string | null }>>();

    if (customerIds.length > 0) {
      const raw = await this.assignmentsRepo
        .createQueryBuilder('a')
        .innerJoin('customer_tags', 't', 't.id = a.tag_id')
        .select('a.customer_id', 'customer_id')
        .addSelect('t.id', 'tag_id')
        .addSelect('t.name', 'tag_name')
        .addSelect('t.color', 'tag_color')
        .where('a.customer_id IN (:...customerIds)', { customerIds })
        .orderBy('t.name', 'ASC')
        .getRawMany();

      raw.forEach((r: any) => {
        const cid = r['customer_id'];
        const entry = { id: r['tag_id'], name: r['tag_name'], color: r['tag_color'] ?? null };
        const arr = tagsByCustomer.get(cid) ?? [];
        arr.push(entry);
        tagsByCustomer.set(cid, arr);
      });
    }

    const data = customers.map((c: any) => ({
      ...c,
      tags: tagsByCustomer.get(c.id) ?? [],
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
