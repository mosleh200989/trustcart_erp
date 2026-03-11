import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AgentCommission } from './entities/agent-commission.entity';
import { CommissionSettings } from './entities/commission-settings.entity';
import { CommissionSlab } from './entities/commission-slab.entity';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';

export interface CommissionSummary {
  agentId: number;
  agentName: string;
  totalSales: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  totalOrders: number;
  currentMonthCommission: number;
  currentMonthSales: number;
  currentMonthOrders: number;
}

export interface CommissionSettingsDto {
  settingType?: string;
  agentId?: number | null;
  commissionType: string;
  fixedAmount?: number;
  percentageRate?: number;
  minOrderValue?: number;
  maxCommission?: number | null;
  isActive?: boolean;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string;
}

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(AgentCommission)
    private commissionRepository: Repository<AgentCommission>,
    @InjectRepository(CommissionSettings)
    private settingsRepository: Repository<CommissionSettings>,
    @InjectRepository(CommissionSlab)
    private slabRepository: Repository<CommissionSlab>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  // ==================== COMMISSION SETTINGS (ADMIN) ====================

  /**
   * Get global commission settings
   */
  async getGlobalSettings(): Promise<CommissionSettings | null> {
    return await this.settingsRepository.findOne({
      where: { settingType: 'global', isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all commission settings
   */
  async getAllSettings(): Promise<CommissionSettings[]> {
    return await this.settingsRepository.find({
      order: { settingType: 'ASC', createdAt: 'DESC' },
      relations: ['agent'],
    });
  }

  /**
   * Get agent-specific settings
   */
  async getAgentSettings(agentId: number): Promise<CommissionSettings | null> {
    return await this.settingsRepository.findOne({
      where: { settingType: 'agent_specific', agentId, isActive: true },
    });
  }

  /**
   * Create or update commission settings
   */
  async upsertSettings(dto: CommissionSettingsDto, adminUserId: number): Promise<CommissionSettings> {
    const settingType = dto.settingType || 'global';
    const agentId = settingType === 'agent_specific' ? dto.agentId : null;

    // Find existing setting
    let existing: CommissionSettings | null = null;
    if (settingType === 'global') {
      existing = await this.settingsRepository.findOne({
        where: { settingType: 'global' },
      });
    } else if (agentId) {
      existing = await this.settingsRepository.findOne({
        where: { settingType: 'agent_specific', agentId },
      });
    }

    if (existing) {
      // Update existing
      existing.commissionType = dto.commissionType;
      existing.fixedAmount = dto.fixedAmount ?? 0;
      existing.percentageRate = dto.percentageRate ?? 0;
      existing.minOrderValue = dto.minOrderValue ?? 0;
      existing.maxCommission = dto.maxCommission ?? null;
      existing.isActive = dto.isActive ?? true;
      existing.effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
      existing.effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
      existing.notes = dto.notes ?? null;
      existing.updatedBy = adminUserId;
      return await this.settingsRepository.save(existing);
    }

    // Create new
    const settings = this.settingsRepository.create({
      settingType,
      agentId,
      commissionType: dto.commissionType,
      fixedAmount: dto.fixedAmount ?? 0,
      percentageRate: dto.percentageRate ?? 0,
      minOrderValue: dto.minOrderValue ?? 0,
      maxCommission: dto.maxCommission ?? null,
      isActive: dto.isActive ?? true,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
      notes: dto.notes ?? null,
      createdBy: adminUserId,
    });

    return await this.settingsRepository.save(settings);
  }

  /**
   * Delete commission settings
   */
  async deleteSettings(settingsId: number): Promise<void> {
    const settings = await this.settingsRepository.findOne({ where: { id: settingsId } });
    if (!settings) {
      throw new NotFoundException('Commission settings not found');
    }
    await this.settingsRepository.remove(settings);
  }

  // ==================== COMMISSION SLABS ====================

  /**
   * Get all slabs for a role type
   */
  async getSlabs(roleType: string): Promise<CommissionSlab[]> {
    return await this.slabRepository.find({
      where: { roleType, isActive: true },
      order: { agentTier: 'ASC', minOrderCount: 'ASC' },
    });
  }

  /**
   * Get all slabs (both agent and team_leader)
   */
  async getAllSlabs(): Promise<{ agent: CommissionSlab[]; teamLeader: CommissionSlab[] }> {
    const all = await this.slabRepository.find({
      where: { isActive: true },
      order: { roleType: 'ASC', agentTier: 'ASC', minOrderCount: 'ASC' },
    });
    return {
      agent: all.filter(s => s.roleType === 'agent'),
      teamLeader: all.filter(s => s.roleType === 'team_leader'),
    };
  }

  /**
   * Save slabs for a role type (replace all existing slabs for that role type)
   */
  async saveSlabs(roleType: string, slabs: Array<{
    agentTier: string;
    minOrderCount: number;
    maxOrderCount: number | null;
    commissionAmount: number;
  }>, adminUserId: number): Promise<CommissionSlab[]> {
    const validTiers = ['silver', 'gold', 'platinum'];
    const validRoles = ['agent', 'team_leader'];
    if (!validRoles.includes(roleType)) {
      throw new BadRequestException('Invalid role type');
    }

    for (const slab of slabs) {
      if (!validTiers.includes(slab.agentTier)) {
        throw new BadRequestException(`Invalid tier: ${slab.agentTier}`);
      }
      if (slab.minOrderCount < 0 || slab.commissionAmount < 0) {
        throw new BadRequestException('Values cannot be negative');
      }
      if (slab.maxOrderCount !== null && slab.maxOrderCount <= slab.minOrderCount) {
        throw new BadRequestException('Max order count must be greater than min');
      }
    }

    // Deactivate existing slabs for this role type
    await this.slabRepository.update(
      { roleType, isActive: true },
      { isActive: false, updatedBy: adminUserId },
    );

    // Create new slabs
    const entities = slabs.map(s => this.slabRepository.create({
      roleType,
      agentTier: s.agentTier,
      minOrderCount: s.minOrderCount,
      maxOrderCount: s.maxOrderCount,
      commissionAmount: s.commissionAmount,
      isActive: true,
      createdBy: adminUserId,
    }));

    return await this.slabRepository.save(entities);
  }

  /**
   * Calculate commission using slab system for an agent/team_leader
   */
  async calculateSlabCommission(orderCount: number, agentTier: string, roleType: string = 'agent'): Promise<number> {
    const slab = await this.slabRepository
      .createQueryBuilder('s')
      .where('s.role_type = :roleType', { roleType })
      .andWhere('s.agent_tier = :agentTier', { agentTier })
      .andWhere('s.is_active = true')
      .andWhere('s.min_order_count <= :orderCount', { orderCount })
      .andWhere('(s.max_order_count IS NULL OR s.max_order_count > :orderCount)', { orderCount })
      .getOne();

    if (!slab) return 0;
    return Number(slab.commissionAmount);
  }

  // ==================== COMMISSION CALCULATION ====================

  /**
   * Get effective commission settings for an agent
   * Returns agent-specific settings if available, otherwise global settings
   */
  async getEffectiveSettings(agentId: number): Promise<CommissionSettings | null> {
    const now = new Date();

    // Check agent-specific settings first
    const agentSettings = await this.settingsRepository.findOne({
      where: { settingType: 'agent_specific', agentId, isActive: true },
    });

    if (agentSettings) {
      // Check if within effective date range
      if (agentSettings.effectiveFrom && agentSettings.effectiveFrom > now) return null;
      if (agentSettings.effectiveUntil && agentSettings.effectiveUntil < now) return null;
      return agentSettings;
    }

    // Fall back to global settings
    const globalSettings = await this.getGlobalSettings();
    if (globalSettings) {
      if (globalSettings.effectiveFrom && globalSettings.effectiveFrom > now) return null;
      if (globalSettings.effectiveUntil && globalSettings.effectiveUntil < now) return null;
      return globalSettings;
    }

    return null;
  }

  /**
   * Calculate commission amount for an order
   */
  calculateCommission(orderAmount: number, settings: CommissionSettings): number {
    if (orderAmount < settings.minOrderValue) {
      return 0;
    }

    let commission = 0;
    if (settings.commissionType === 'fixed') {
      commission = Number(settings.fixedAmount);
    } else if (settings.commissionType === 'percentage') {
      commission = (orderAmount * Number(settings.percentageRate)) / 100;
    }

    // Apply cap if set
    if (settings.maxCommission && commission > settings.maxCommission) {
      commission = Number(settings.maxCommission);
    }

    return Math.round(commission * 100) / 100; // Round to 2 decimal places
  }

  // ==================== COMMISSION RECORDS ====================

  /**
   * Create a commission record for a sale
   */
  async createCommission(data: {
    agentId: number;
    customerId: number;
    salesOrderId: number;
    orderAmount: number;
  }): Promise<AgentCommission | null> {
    // Verify the customer is assigned to this agent
    const customer = await this.customerRepository.findOne({
      where: { id: data.customerId },
    });

    if (!customer || customer.assigned_to !== data.agentId) {
      // Customer not assigned to this agent, no commission
      return null;
    }

    // Get effective commission settings
    const settings = await this.getEffectiveSettings(data.agentId);
    if (!settings) {
      // No commission settings configured
      return null;
    }

    // Calculate commission
    const commissionAmount = this.calculateCommission(data.orderAmount, settings);
    if (commissionAmount <= 0) {
      return null;
    }

    // Check for duplicate (same order)
    const existing = await this.commissionRepository.findOne({
      where: { salesOrderId: data.salesOrderId, agentId: data.agentId },
    });

    if (existing) {
      return existing; // Already recorded
    }

    // Create commission record
    const commission = this.commissionRepository.create({
      agentId: data.agentId,
      customerId: data.customerId,
      salesOrderId: data.salesOrderId,
      orderAmount: data.orderAmount,
      commissionRate: settings.commissionType === 'percentage' ? settings.percentageRate : 0,
      commissionAmount,
      commissionType: settings.commissionType,
      status: 'pending',
    });

    return await this.commissionRepository.save(commission);
  }

  /**
   * Get commissions for an agent
   */
  async getAgentCommissions(
    agentId: number,
    query: { status?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: AgentCommission[]; total: number }> {
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const qb = this.commissionRepository.createQueryBuilder('c');
    qb.where('c.agent_id = :agentId', { agentId });

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    qb.orderBy('c.created_at', 'DESC');
    qb.skip(skip).take(Number(limit));

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Get commission summary for an agent
   */
  async getAgentCommissionSummary(agentId: number): Promise<CommissionSummary> {
    const agent = await this.userRepository.findOne({ where: { id: agentId } });
    const agentName = agent ? `${agent.name || ''} ${agent.lastName || ''}`.trim() : `Agent #${agentId}`;

    // Total stats
    const totalStats = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.order_amount)', 'totalSales')
      .addSelect('SUM(c.commission_amount)', 'totalCommission')
      .addSelect('COUNT(c.id)', 'totalOrders')
      .where('c.agent_id = :agentId', { agentId })
      .getRawOne();

    // Status breakdown
    const statusStats = await this.commissionRepository
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('SUM(c.commission_amount)', 'amount')
      .where('c.agent_id = :agentId', { agentId })
      .groupBy('c.status')
      .getRawMany();

    const statusMap: Record<string, number> = {};
    for (const row of statusStats) {
      statusMap[row.status] = parseFloat(row.amount || '0');
    }

    // Current month stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthStats = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.order_amount)', 'monthSales')
      .addSelect('SUM(c.commission_amount)', 'monthCommission')
      .addSelect('COUNT(c.id)', 'monthOrders')
      .where('c.agent_id = :agentId', { agentId })
      .andWhere('c.created_at >= :startOfMonth', { startOfMonth })
      .getRawOne();

    return {
      agentId,
      agentName,
      totalSales: parseFloat(totalStats?.totalSales || '0'),
      totalCommissionEarned: parseFloat(totalStats?.totalCommission || '0'),
      pendingCommission: statusMap['pending'] || 0,
      approvedCommission: statusMap['approved'] || 0,
      paidCommission: statusMap['paid'] || 0,
      totalOrders: parseInt(totalStats?.totalOrders || '0', 10),
      currentMonthCommission: parseFloat(monthStats?.monthCommission || '0'),
      currentMonthSales: parseFloat(monthStats?.monthSales || '0'),
      currentMonthOrders: parseInt(monthStats?.monthOrders || '0', 10),
    };
  }

  /**
   * Get all commissions (admin view)
   */
  async getAllCommissions(
    query: { status?: string; agentId?: number; page?: number; limit?: number } = {},
  ): Promise<{ data: any[]; total: number }> {
    const { status, agentId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const qb = this.commissionRepository.createQueryBuilder('c');
    qb.leftJoinAndSelect('c.agent', 'agent');

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }
    if (agentId) {
      qb.andWhere('c.agent_id = :agentId', { agentId });
    }

    qb.orderBy('c.created_at', 'DESC');
    qb.skip(skip).take(Number(limit));

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((c) => ({
        id: c.id,
        agentId: c.agentId,
        agentName: c.agent ? `${c.agent.name || ''} ${c.agent.lastName || ''}`.trim() : `Agent #${c.agentId}`,
        customerId: c.customerId,
        salesOrderId: c.salesOrderId,
        orderAmount: parseFloat(String(c.orderAmount)),
        commissionRate: parseFloat(String(c.commissionRate)),
        commissionAmount: parseFloat(String(c.commissionAmount)),
        commissionType: c.commissionType,
        status: c.status,
        approvedAt: c.approvedAt,
        paidAt: c.paidAt,
        createdAt: c.createdAt,
      })),
      total,
    };
  }

  /**
   * Approve a commission
   */
  async approveCommission(commissionId: number, adminUserId: number): Promise<AgentCommission> {
    const commission = await this.commissionRepository.findOne({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new NotFoundException('Commission record not found');
    }

    if (commission.status !== 'pending') {
      throw new BadRequestException('Only pending commissions can be approved');
    }

    commission.status = 'approved';
    commission.approvedBy = adminUserId;
    commission.approvedAt = new Date();

    return await this.commissionRepository.save(commission);
  }

  /**
   * Mark commission as paid
   */
  async markCommissionPaid(commissionId: number, adminUserId: number): Promise<AgentCommission> {
    const commission = await this.commissionRepository.findOne({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new NotFoundException('Commission record not found');
    }

    if (commission.status !== 'approved') {
      throw new BadRequestException('Only approved commissions can be marked as paid');
    }

    commission.status = 'paid';
    commission.paidAt = new Date();

    return await this.commissionRepository.save(commission);
  }

  /**
   * Cancel a commission
   */
  async cancelCommission(commissionId: number, reason: string): Promise<AgentCommission> {
    const commission = await this.commissionRepository.findOne({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new NotFoundException('Commission record not found');
    }

    if (commission.status === 'paid') {
      throw new BadRequestException('Paid commissions cannot be cancelled');
    }

    commission.status = 'cancelled';
    commission.notes = reason;

    return await this.commissionRepository.save(commission);
  }

  /**
   * Bulk approve commissions
   */
  async bulkApprove(commissionIds: number[], adminUserId: number): Promise<number> {
    const result = await this.commissionRepository
      .createQueryBuilder()
      .update()
      .set({
        status: 'approved',
        approvedBy: adminUserId,
        approvedAt: new Date(),
      })
      .where('id IN (:...ids)', { ids: commissionIds })
      .andWhere('status = :status', { status: 'pending' })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get commission report for admin
   */
  async getCommissionReport(params: { startDate?: string; endDate?: string }): Promise<any> {
    const qb = this.commissionRepository.createQueryBuilder('c');
    qb.leftJoin('c.agent', 'agent');
    qb.select('c.agent_id', 'agentId');
    qb.addSelect("CONCAT(agent.name, ' ', agent.last_name)", 'agentName');
    qb.addSelect('COUNT(c.id)', 'totalOrders');
    qb.addSelect('SUM(c.order_amount)', 'totalSales');
    qb.addSelect('SUM(c.commission_amount)', 'totalCommission');
    qb.addSelect(
      `SUM(CASE WHEN c.status = 'pending' THEN c.commission_amount ELSE 0 END)`,
      'pendingCommission',
    );
    qb.addSelect(
      `SUM(CASE WHEN c.status = 'approved' THEN c.commission_amount ELSE 0 END)`,
      'approvedCommission',
    );
    qb.addSelect(
      `SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END)`,
      'paidCommission',
    );

    if (params.startDate) {
      qb.andWhere('c.created_at >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('c.created_at <= :endDate', { endDate: params.endDate });
    }

    qb.groupBy('c.agent_id');
    qb.addGroupBy('agent.name');
    qb.addGroupBy('agent.last_name');
    qb.orderBy('totalCommission', 'DESC');

    return await qb.getRawMany();
  }

  // ==================== AGENT REPORT ====================

  /**
   * Get agent-wise commission summary report
   */
  async getAgentCommissionReport(query: {
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number }> {
    const { search, page = 1, limit = 50 } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    const searchCondition = search && search.trim()
      ? `AND (u.name ILIKE $1 OR u.last_name ILIKE $1 OR u.phone ILIKE $1)`
      : '';
    const searchParam = search && search.trim() ? [`%${search.trim()}%`] : [];

    // Count distinct agents
    const countSql = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE (LOWER(r.name) LIKE '%sales executive%' OR r.slug = 'sales-executive')
      ${searchCondition}
    `;
    const countResult = await this.dataSource.query(countSql, searchParam);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Main data query
    const pIdx = searchParam.length + 1;
    const dataSql = `
      SELECT
        u.id as agent_id,
        CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, '')) as agent_name,
        u.phone,
        COALESCE(order_stats.total_orders, 0) as total_orders,
        COALESCE(product_qty_stats.total_product_qty, 0) as total_product_qty,
        GREATEST(COALESCE(product_qty_stats.total_product_qty, 0) - COALESCE(order_stats.total_orders, 0), 0) as upsell_qty,
        COALESCE(order_stats.total_amount, 0) as total_amount,
        COALESCE(commission_stats.total_commission, 0) as total_commission,
        COALESCE(commission_stats.paid_commission, 0) as paid_commission,
        COALESCE(commission_stats.total_commission, 0) - COALESCE(commission_stats.paid_commission, 0) as balance
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      LEFT JOIN (
        SELECT
          so.created_by as agent_id,
          COUNT(so.id) as total_orders,
          COALESCE(SUM(so.total_amount), 0) as total_amount
        FROM sales_orders so
        WHERE so.created_by IS NOT NULL
          AND so.order_source IN ('admin_panel', 'agent_dashboard')
        GROUP BY so.created_by
      ) order_stats ON order_stats.agent_id = u.id
      LEFT JOIN (
        SELECT agent_id, SUM(qty) as total_product_qty FROM (
          SELECT so.created_by as agent_id, COALESCE(SUM(soi.quantity), 0) as qty
          FROM sales_order_items soi
          INNER JOIN sales_orders so ON so.id = soi.sales_order_id
          WHERE so.created_by IS NOT NULL
            AND so.order_source IN ('admin_panel', 'agent_dashboard')
          GROUP BY so.created_by
          UNION ALL
          SELECT so.created_by as agent_id, COALESCE(SUM(oi.quantity), 0) as qty
          FROM order_items oi
          INNER JOIN sales_orders so ON so.id = oi.order_id
          WHERE so.created_by IS NOT NULL
            AND so.order_source IN ('admin_panel', 'agent_dashboard')
          GROUP BY so.created_by
        ) combined GROUP BY agent_id
      ) product_qty_stats ON product_qty_stats.agent_id = u.id
      LEFT JOIN (
        SELECT
          ac.agent_id,
          COALESCE(SUM(ac.commission_amount), 0) as total_commission,
          COALESCE(SUM(CASE WHEN ac.status = 'paid' THEN ac.commission_amount ELSE 0 END), 0) as paid_commission
        FROM agent_commissions ac
        GROUP BY ac.agent_id
      ) commission_stats ON commission_stats.agent_id = u.id
      WHERE (LOWER(r.name) LIKE '%sales executive%' OR r.slug = 'sales-executive')
      ${searchCondition}
      ORDER BY agent_name ASC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;
    const dataParams = [...searchParam, limitNum, offset];
    const rows = await this.dataSource.query(dataSql, dataParams);

    return {
      data: rows.map((r: any) => ({
        agentId: r.agent_id,
        agentName: (r.agent_name || '').trim(),
        phone: r.phone || '',
        totalOrders: parseInt(r.total_orders || '0', 10),
        totalProductQty: parseInt(r.total_product_qty || '0', 10),
        upsellQty: parseInt(r.upsell_qty || '0', 10),
        totalAmount: parseFloat(r.total_amount || '0'),
        totalCommission: parseFloat(r.total_commission || '0'),
        paidCommission: parseFloat(r.paid_commission || '0'),
        balance: parseFloat(r.balance || '0'),
      })),
      total,
    };
  }

  // ==================== PAYMENT REQUESTS ====================

  async createPaymentRequest(data: {
    agentId: number;
    requestedAmount: number;
    paymentMethod?: string;
    notes?: string;
    requestedBy: number;
  }): Promise<any> {
    const sql = `
      INSERT INTO commission_payment_requests (agent_id, requested_amount, payment_method, notes, requested_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.dataSource.query(sql, [
      data.agentId, data.requestedAmount, data.paymentMethod || null, data.notes || null, data.requestedBy,
    ]);
    return result[0];
  }

  async getPaymentRequests(query: {
    status?: string;
    agentId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number; agents: any[] }> {
    const { status, agentId, search, startDate, endDate, page = 1, limit = 50 } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`pr.status = $${paramIdx++}`);
      params.push(status);
    }
    if (agentId) {
      conditions.push(`pr.agent_id = $${paramIdx++}`);
      params.push(Number(agentId));
    }
    if (startDate) {
      conditions.push(`pr.created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`pr.created_at <= ($${paramIdx++}::date + INTERVAL '1 day')`);
      params.push(endDate);
    }
    if (search && search.trim()) {
      conditions.push(`(u.name ILIKE $${paramIdx} OR u.last_name ILIKE $${paramIdx} OR u.phone ILIKE $${paramIdx} OR pr.payment_reference ILIKE $${paramIdx})`);
      params.push(`%${search.trim()}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(*) as total
      FROM commission_payment_requests pr
      LEFT JOIN users u ON u.id = pr.agent_id
      WHERE 1=1 ${whereClause}
    `;
    const countResult = await this.dataSource.query(countSql, params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    const dataSql = `
      SELECT
        pr.*,
        CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, '')) as agent_name,
        u.phone as agent_phone,
        u.payment_method as agent_preferred_method,
        u.bkash_number as agent_bkash_number,
        u.nagad_number as agent_nagad_number,
        u.rocket_number as agent_rocket_number,
        u.bank_name as agent_bank_name,
        u.bank_account_holder as agent_bank_account_holder,
        u.bank_account_number as agent_bank_account_number,
        u.bank_branch_name as agent_bank_branch_name,
        CONCAT(COALESCE(ab.name, ''), ' ', COALESCE(ab.last_name, '')) as approved_by_name,
        CONCAT(COALESCE(pb.name, ''), ' ', COALESCE(pb.last_name, '')) as paid_by_name,
        CONCAT(COALESCE(rb.name, ''), ' ', COALESCE(rb.last_name, '')) as rejected_by_name
      FROM commission_payment_requests pr
      LEFT JOIN users u ON u.id = pr.agent_id
      LEFT JOIN users ab ON ab.id = pr.approved_by
      LEFT JOIN users pb ON pb.id = pr.paid_by
      LEFT JOIN users rb ON rb.id = pr.rejected_by
      WHERE 1=1 ${whereClause}
      ORDER BY pr.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    const dataParams = [...params, limitNum, offset];
    const rows = await this.dataSource.query(dataSql, dataParams);

    // Get all Sales Executives for filter
    const agentsSql = `
      SELECT u.id, CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, '')) as name,
             u.payment_method as preferred_method
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE LOWER(r.name) LIKE '%sales executive%' OR r.slug = 'sales-executive'
      ORDER BY u.name ASC
    `;
    const agents = await this.dataSource.query(agentsSql);

    return {
      data: rows.map((r: any) => ({
        id: r.id,
        agentId: r.agent_id,
        agentName: (r.agent_name || '').trim(),
        agentPhone: r.agent_phone || '',
        agentPreferredMethod: r.agent_preferred_method || null,
        agentBkashNumber: r.agent_bkash_number || null,
        agentNagadNumber: r.agent_nagad_number || null,
        agentRocketNumber: r.agent_rocket_number || null,
        agentBankName: r.agent_bank_name || null,
        agentBankAccountHolder: r.agent_bank_account_holder || null,
        agentBankAccountNumber: r.agent_bank_account_number || null,
        agentBankBranchName: r.agent_bank_branch_name || null,
        requestedAmount: parseFloat(r.requested_amount || '0'),
        approvedAmount: r.approved_amount ? parseFloat(r.approved_amount) : null,
        paymentMethod: r.payment_method,
        paymentReference: r.payment_reference,
        status: r.status,
        notes: r.notes,
        adminNotes: r.admin_notes,
        approvedByName: (r.approved_by_name || '').trim(),
        paidByName: (r.paid_by_name || '').trim(),
        rejectedByName: (r.rejected_by_name || '').trim(),
        approvedAt: r.approved_at,
        paidAt: r.paid_at,
        rejectedAt: r.rejected_at,
        createdAt: r.created_at,
      })),
      total,
      agents: agents.map((a: any) => ({ id: a.id, name: (a.name || '').trim(), preferredMethod: a.preferred_method || null })),
    };
  }

  async approvePaymentRequest(id: number, adminUserId: number, approvedAmount?: number): Promise<any> {
    const rows = await this.dataSource.query(`SELECT * FROM commission_payment_requests WHERE id = $1`, [id]);
    if (!rows.length) throw new NotFoundException('Payment request not found');
    if (rows[0].status !== 'pending') throw new BadRequestException('Only pending requests can be approved');

    const amount = approvedAmount ?? parseFloat(rows[0].requested_amount);
    await this.dataSource.query(
      `UPDATE commission_payment_requests SET status = 'approved', approved_amount = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [amount, adminUserId, id],
    );
    return { success: true };
  }

  async markPaymentRequestPaid(id: number, adminUserId: number, paymentMethod?: string, paymentReference?: string, adminNotes?: string): Promise<any> {
    const rows = await this.dataSource.query(`SELECT * FROM commission_payment_requests WHERE id = $1`, [id]);
    if (!rows.length) throw new NotFoundException('Payment request not found');
    if (rows[0].status !== 'approved') throw new BadRequestException('Only approved requests can be marked as paid');

    await this.dataSource.query(
      `UPDATE commission_payment_requests SET status = 'paid', paid_by = $1, paid_at = NOW(), payment_method = COALESCE($2, payment_method), payment_reference = COALESCE($3, payment_reference), admin_notes = COALESCE($4, admin_notes), updated_at = NOW() WHERE id = $5`,
      [adminUserId, paymentMethod || null, paymentReference || null, adminNotes || null, id],
    );
    return { success: true };
  }

  async rejectPaymentRequest(id: number, adminUserId: number, adminNotes?: string): Promise<any> {
    const rows = await this.dataSource.query(`SELECT * FROM commission_payment_requests WHERE id = $1`, [id]);
    if (!rows.length) throw new NotFoundException('Payment request not found');
    if (rows[0].status !== 'pending' && rows[0].status !== 'approved') throw new BadRequestException('This request cannot be rejected');

    await this.dataSource.query(
      `UPDATE commission_payment_requests SET status = 'rejected', rejected_by = $1, rejected_at = NOW(), admin_notes = COALESCE($2, admin_notes), updated_at = NOW() WHERE id = $3`,
      [adminUserId, adminNotes || null, id],
    );
    return { success: true };
  }

  async getPaymentHistory(query: {
    agentId?: number;
    paymentMethod?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number; agents: any[]; summary: any }> {
    const { agentId, paymentMethod, search, startDate, endDate, page = 1, limit = 50 } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [`pr.status = 'paid'`];
    const params: any[] = [];
    let paramIdx = 1;

    if (agentId) {
      conditions.push(`pr.agent_id = $${paramIdx++}`);
      params.push(Number(agentId));
    }
    if (paymentMethod) {
      conditions.push(`pr.payment_method = $${paramIdx++}`);
      params.push(paymentMethod);
    }
    if (startDate) {
      conditions.push(`pr.paid_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`pr.paid_at <= ($${paramIdx++}::date + INTERVAL '1 day')`);
      params.push(endDate);
    }
    if (search && search.trim()) {
      conditions.push(`(u.name ILIKE $${paramIdx} OR u.last_name ILIKE $${paramIdx} OR u.phone ILIKE $${paramIdx} OR pr.payment_reference ILIKE $${paramIdx})`);
      params.push(`%${search.trim()}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(*) as total
      FROM commission_payment_requests pr
      LEFT JOIN users u ON u.id = pr.agent_id
      ${whereClause}
    `;
    const countResult = await this.dataSource.query(countSql, params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Summary stats
    const summarySql = `
      SELECT
        COUNT(*) as total_payments,
        COALESCE(SUM(pr.approved_amount), 0) as total_paid_amount
      FROM commission_payment_requests pr
      LEFT JOIN users u ON u.id = pr.agent_id
      ${whereClause}
    `;
    const summaryResult = await this.dataSource.query(summarySql, params);

    const dataSql = `
      SELECT
        pr.*,
        CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, '')) as agent_name,
        u.phone as agent_phone,
        CONCAT(COALESCE(ab.name, ''), ' ', COALESCE(ab.last_name, '')) as approved_by_name,
        CONCAT(COALESCE(pb.name, ''), ' ', COALESCE(pb.last_name, '')) as paid_by_name
      FROM commission_payment_requests pr
      LEFT JOIN users u ON u.id = pr.agent_id
      LEFT JOIN users ab ON ab.id = pr.approved_by
      LEFT JOIN users pb ON pb.id = pr.paid_by
      ${whereClause}
      ORDER BY pr.paid_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    const dataParams = [...params, limitNum, offset];
    const rows = await this.dataSource.query(dataSql, dataParams);

    const agentsSql = `
      SELECT u.id, CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, '')) as name
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE LOWER(r.name) LIKE '%sales executive%' OR r.slug = 'sales-executive'
      ORDER BY u.name ASC
    `;
    const agents = await this.dataSource.query(agentsSql);

    return {
      data: rows.map((r: any) => ({
        id: r.id,
        agentId: r.agent_id,
        agentName: (r.agent_name || '').trim(),
        agentPhone: r.agent_phone || '',
        requestedAmount: parseFloat(r.requested_amount || '0'),
        approvedAmount: r.approved_amount ? parseFloat(r.approved_amount) : null,
        paymentMethod: r.payment_method,
        paymentReference: r.payment_reference,
        notes: r.notes,
        adminNotes: r.admin_notes,
        approvedByName: (r.approved_by_name || '').trim(),
        paidByName: (r.paid_by_name || '').trim(),
        approvedAt: r.approved_at,
        paidAt: r.paid_at,
        createdAt: r.created_at,
      })),
      total,
      agents: agents.map((a: any) => ({ id: a.id, name: (a.name || '').trim() })),
      summary: {
        totalPayments: parseInt(summaryResult[0]?.total_payments || '0', 10),
        totalPaidAmount: parseFloat(summaryResult[0]?.total_paid_amount || '0'),
      },
    };
  }

  // ==================== HELPER: AUTO-CREATE COMMISSION ON ORDER ====================

  /**
   * Update editable fields on a commission sales row
   */
  async updateCommissionSaleFields(
    orderId: number,
    data: { totalAmount?: number; deliveryCharge?: number; codAmount?: number; commissionAmount?: number },
  ): Promise<{ success: boolean }> {
    // Update sales_orders fields
    const orderUpdates: string[] = [];
    const orderParams: any[] = [];
    let idx = 1;

    if (data.totalAmount !== undefined) {
      orderUpdates.push(`total_amount = $${idx++}`);
      orderParams.push(data.totalAmount);
    }
    if (data.deliveryCharge !== undefined) {
      orderUpdates.push(`delivery_charge = $${idx++}`);
      orderParams.push(data.deliveryCharge);
    }
    if (data.codAmount !== undefined) {
      orderUpdates.push(`cod_amount = $${idx++}`);
      orderParams.push(data.codAmount);
    }

    if (orderUpdates.length > 0) {
      orderParams.push(orderId);
      await this.dataSource.query(
        `UPDATE sales_orders SET ${orderUpdates.join(', ')} WHERE id = $${idx}`,
        orderParams,
      );
    }

    // Update commission amount in agent_commissions (if record exists)
    if (data.commissionAmount !== undefined) {
      await this.dataSource.query(
        `UPDATE agent_commissions SET commission_amount = $1 WHERE sales_order_id = $2`,
        [data.commissionAmount, orderId],
      );
    }

    return { success: true };
  }

  /**
   * Get commission sales data (orders with commission info, agent/reseller details, products)
   */
  async getCommissionSales(query: {
    status?: string;
    agentId?: number;
    commissionStatus?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; total: number; agents: any[] }> {
    const { status, agentId, commissionStatus, paymentStatus, startDate, endDate, search, page = 1, limit = 50 } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`so.status = $${paramIdx++}`);
      params.push(status);
    }
    if (agentId) {
      conditions.push(`c.assigned_to = $${paramIdx++}`);
      params.push(Number(agentId));
    }
    if (commissionStatus) {
      conditions.push(`ac.status = $${paramIdx++}`);
      params.push(commissionStatus);
    }
    if (paymentStatus) {
      conditions.push(`so.payment_status = $${paramIdx++}`);
      params.push(paymentStatus);
    }
    if (startDate) {
      conditions.push(`so.order_date >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`so.order_date <= $${paramIdx++}`);
      params.push(endDate);
    }
    if (search && search.trim()) {
      conditions.push(`(so.courier_order_id ILIKE $${paramIdx} OR so.sales_order_number ILIKE $${paramIdx})`);
      params.push(`%${search.trim()}%`);
      paramIdx++;
    }

    // Always exclude website orders
    conditions.push(`(so.order_source IS NULL OR so.order_source != 'website')`);

    const whereClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    // Count query — start from sales_orders, join customers for agent link
    const countSql = `
      SELECT COUNT(*) as total
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN agent_commissions ac ON ac.sales_order_id = so.id
      WHERE 1=1 ${whereClause}
    `;
    const countResult = await this.dataSource.query(countSql, params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Data query
    const dataSql = `
      SELECT
        ac.id as commission_id,
        c.assigned_to as agent_id,
        so.customer_id,
        ac.order_amount as commission_order_amount,
        ac.commission_rate,
        ac.commission_amount,
        ac.commission_type,
        ac.status as commission_status,
        ac.approved_at,
        ac.paid_at,
        so.id as order_id,
        so.sales_order_number,
        so.order_date,
        so.status as order_status,
        so.total_amount,
        so.delivery_charge,
        so.cod_amount,
        so.discount_amount,
        so.courier_company,
        so.courier_order_id,
        so.tracking_id,
        so.payment_status,
        so.customer_name,
        so.customer_phone,
        so.shipping_address,
        CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, '')) as agent_name,
        (
          SELECT STRING_AGG(
            REGEXP_REPLACE(COALESCE(p.name_bn, soi.product_name, ''), '\s*\([0-9]+(\.[0-9]+)?\)\s*$', '') || '|||' || CAST(soi.quantity AS TEXT),
            ':::'
          )
          FROM sales_order_items soi
          LEFT JOIN products p ON p.id = soi.product_id
          WHERE soi.sales_order_id = so.id
        ) as products
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN users u ON u.id = c.assigned_to
      LEFT JOIN agent_commissions ac ON ac.sales_order_id = so.id
      WHERE 1=1 ${whereClause}
      ORDER BY so.order_date DESC, so.id DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    const dataParams = [...params, limitNum, offset];
    const rows = await this.dataSource.query(dataSql, dataParams);

    // Get all Sales Executives for filter dropdown
    const agentsSql = `
      SELECT u.id, CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, '')) as name
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE LOWER(r.name) LIKE '%sales executive%' OR r.slug = 'sales-executive'
      ORDER BY name
    `;
    const agents = await this.dataSource.query(agentsSql);

    return {
      data: rows.map((r: any) => ({
        commissionId: r.commission_id || r.order_id,
        agentId: r.agent_id,
        agentName: (r.agent_name || '').trim(),
        customerId: r.customer_id,
        orderId: r.order_id,
        salesOrderNumber: r.sales_order_number,
        orderDate: r.order_date,
        orderStatus: r.order_status,
        totalAmount: parseFloat(r.total_amount || '0'),
        deliveryCharge: parseFloat(r.delivery_charge || '0'),
        codAmount: parseFloat(r.cod_amount || '0'),
        discountAmount: parseFloat(r.discount_amount || '0'),
        courierCompany: r.courier_company,
        courierOrderId: r.courier_order_id,
        trackingId: r.tracking_id,
        paymentStatus: r.payment_status,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        commissionRate: parseFloat(r.commission_rate || '0'),
        commissionAmount: parseFloat(r.commission_amount || '0'),
        commissionType: r.commission_type || '',
        commissionStatus: r.commission_status || 'pending',
        approvedAt: r.approved_at,
        paidAt: r.paid_at,
        products: r.products || '',
      })),
      total,
      agents: agents.map((a: any) => ({ id: a.id, name: (a.name || '').trim() })),
    };
  }

  /**
   * Process a completed order and create commission if applicable
   * Call this when an order is completed/delivered
   */
  async processOrderForCommission(
    salesOrderId: number,
    customerId: number,
    orderAmount: number,
  ): Promise<AgentCommission | null> {
    // Get the customer's assigned agent
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer || !customer.assigned_to) {
      return null; // No agent assigned
    }

    return await this.createCommission({
      agentId: customer.assigned_to,
      customerId,
      salesOrderId,
      orderAmount,
    });
  }
}
