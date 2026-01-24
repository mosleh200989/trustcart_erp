import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AgentCommission } from './entities/agent-commission.entity';
import { CommissionSettings } from './entities/commission-settings.entity';
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

  // ==================== HELPER: AUTO-CREATE COMMISSION ON ORDER ====================

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
