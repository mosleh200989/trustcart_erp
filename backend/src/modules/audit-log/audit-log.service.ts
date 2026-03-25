import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(data: Partial<AuditLog>): Promise<AuditLog> {
    const log = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(log);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    module?: string;
    action?: string;
    entityType?: string;
    performedBy?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const { page = 1, limit = 30, search, module, action, entityType, performedBy, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepository.createQueryBuilder('al');

    if (module) {
      qb.andWhere('al.module = :module', { module });
    }
    if (action) {
      qb.andWhere('al.action = :action', { action });
    }
    if (entityType) {
      qb.andWhere('al.entity_type = :entityType', { entityType });
    }
    if (performedBy) {
      qb.andWhere('al.performed_by = :performedBy', { performedBy });
    }
    if (startDate) {
      qb.andWhere('al.created_at >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('al.created_at <= :endDate', { endDate: end });
    }
    if (search && search.trim()) {
      qb.andWhere(
        '(LOWER(al.description) LIKE LOWER(:search) OR LOWER(al.entity_type) LIKE LOWER(:search) OR LOWER(al.performed_by_name) LIKE LOWER(:search) OR al.entity_id LIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    qb.orderBy('al.created_at', 'DESC');
    const total = await qb.getCount();
    qb.skip(skip).take(limit);
    const data = await qb.getMany();

    return { data, total };
  }

  async findOne(id: number): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  /** Get distinct modules for filter dropdowns */
  async getDistinctModules(): Promise<string[]> {
    const rows = await this.auditLogRepository
      .createQueryBuilder('al')
      .select('DISTINCT al.module', 'module')
      .orderBy('al.module', 'ASC')
      .getRawMany();
    return rows.map((r) => r.module);
  }

  /** Get distinct entity types for filter dropdowns */
  async getDistinctEntityTypes(): Promise<string[]> {
    const rows = await this.auditLogRepository
      .createQueryBuilder('al')
      .select('DISTINCT al.entity_type', 'entity_type')
      .orderBy('al.entity_type', 'ASC')
      .getRawMany();
    return rows.map((r) => r.entity_type);
  }

  /** Get summary stats */
  async getStats(): Promise<{
    totalLogs: number;
    todayLogs: number;
    uniqueUsers: number;
    topModules: { module: string; count: number }[];
  }> {
    const totalLogs = await this.auditLogRepository.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = await this.auditLogRepository
      .createQueryBuilder('al')
      .where('al.created_at >= :today', { today })
      .getCount();

    const uniqueUsersResult = await this.auditLogRepository
      .createQueryBuilder('al')
      .select('COUNT(DISTINCT al.performed_by)', 'count')
      .where('al.performed_by IS NOT NULL')
      .getRawOne();

    const topModules = await this.auditLogRepository
      .createQueryBuilder('al')
      .select('al.module', 'module')
      .addSelect('COUNT(*)', 'count')
      .groupBy('al.module')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalLogs,
      todayLogs,
      uniqueUsers: Number(uniqueUsersResult?.count || 0),
      topModules: topModules.map((r) => ({ module: r.module, count: Number(r.count) })),
    };
  }
}
