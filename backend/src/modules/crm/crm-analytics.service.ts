import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { Deal } from './entities/deal.entity';
import { Task } from './entities/task.entity';
import { CallTask } from './entities/call-task.entity';
import { Customer } from '../customers/customer.entity';

@Injectable()
export class CrmAnalyticsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(CallTask)
    private readonly callTaskRepository: Repository<CallTask>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly dataSource: DataSource,
  ) {}

  async getSummary(rangeDays: number = 30) {
    const safeRangeDays = Number.isFinite(rangeDays) ? Math.max(1, Math.min(3650, rangeDays)) : 30;
    const since = new Date();
    since.setDate(since.getDate() - safeRangeDays);

    const openDealsBase = this.dealRepository
      .createQueryBuilder('d')
      .where('d.status = :status', { status: 'open' })
      .andWhere('d.createdAt >= :since', { since });

    const openAgg = await openDealsBase
      .clone()
      .select('COUNT(*)', 'activeDeals')
      .addSelect('COALESCE(SUM(d.value), 0)', 'totalPipelineValue')
      .addSelect('COALESCE(AVG(d.value), 0)', 'avgDealSize')
      .getRawOne<{ activedeals: string; totalpipelinevalue: string; avgdealsize: string }>();

    const pipelineByStageRaw = await openDealsBase
      .clone()
      .select('d.stage', 'name')
      .addSelect('COUNT(*)', 'deals')
      .addSelect('COALESCE(SUM(d.value), 0)', 'value')
      .groupBy('d.stage')
      .orderBy('value', 'DESC')
      .getRawMany<{ name: string; deals: string; value: string }>();

    const closedBase = this.dealRepository
      .createQueryBuilder('d')
      .where('d.status IN (:...statuses)', { statuses: ['won', 'lost'] })
      .andWhere('d.updatedAt >= :since', { since });

    const closedByStatusRaw = await closedBase
      .clone()
      .select('d.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.status')
      .getRawMany<{ status: string; count: string }>();

    const won = Number(closedByStatusRaw.find((r) => r.status === 'won')?.count ?? 0);
    const lost = Number(closedByStatusRaw.find((r) => r.status === 'lost')?.count ?? 0);
    const closedTotal = won + lost;
    const winRate = closedTotal > 0 ? (won / closedTotal) * 100 : 0;

    const revenueTrendRaw = await this.dealRepository
      .createQueryBuilder('d')
      .where('d.status = :wonStatus', { wonStatus: 'won' })
      .andWhere('d.updatedAt >= :since', { since })
      .select("date_trunc('month', d.updatedAt)", 'bucket')
      .addSelect("TO_CHAR(date_trunc('month', d.updatedAt), 'Mon YY')", 'month')
      .addSelect('COUNT(*)', 'deals')
      .addSelect('COALESCE(SUM(d.value), 0)', 'revenue')
      .groupBy('bucket')
      .addGroupBy('month')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ month: string; deals: string; revenue: string }>();

    const activityDistributionRaw = await this.activityRepository
      .createQueryBuilder('a')
      .where('a.createdAt >= :since', { since })
      .select('a.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.type')
      .orderBy('count', 'DESC')
      .getRawMany<{ type: string; count: string }>();

    const topPerformersRaw = await this.dealRepository
      .createQueryBuilder('d')
      .innerJoin('d.owner', 'owner')
      .where('d.status = :wonStatus', { wonStatus: 'won' })
      .andWhere('d.updatedAt >= :since', { since })
      .select('owner.id', 'ownerId')
      .addSelect("CONCAT(owner.name, ' ', owner.lastName)", 'name')
      .addSelect('COUNT(*)', 'deals')
      .addSelect('COALESCE(SUM(d.value), 0)', 'revenue')
      .groupBy('owner.id')
      .addGroupBy('owner.name')
      .addGroupBy('owner.lastName')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany<{ ownerid: string; name: string; deals: string; revenue: string }>();

    return {
      rangeDays: safeRangeDays,
      since,
      keyMetrics: {
        totalPipelineValue: Number((openAgg as any)?.totalpipelinevalue ?? 0),
        activeDeals: Number((openAgg as any)?.activedeals ?? 0),
        winRate,
        avgDealSize: Number((openAgg as any)?.avgdealsize ?? 0),
      },
      pipelineByStage: (pipelineByStageRaw || []).map((r) => ({
        name: r.name,
        deals: Number(r.deals || 0),
        value: Number(r.value || 0),
      })),
      revenueTrend: (revenueTrendRaw || []).map((r) => ({
        month: r.month,
        deals: Number(r.deals || 0),
        revenue: Number(r.revenue || 0),
      })),
      activityDistribution: (activityDistributionRaw || []).map((r) => ({
        type: r.type,
        count: Number(r.count || 0),
      })),
      topPerformers: (topPerformersRaw || []).map((r) => ({
        name: r.name,
        deals: Number(r.deals || 0),
        revenue: Number(r.revenue || 0),
      })),
      closed: { won, lost, total: closedTotal },
    };
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total customers count
    const totalCustomers = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.is_deleted = :deleted', { deleted: false })
      .getCount();

    // Hot leads (customers with priority = 'hot')
    const hotLeads = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.is_deleted = :deleted', { deleted: false })
      .andWhere('c.priority = :priority', { priority: 'hot' })
      .getCount();

    // Warm leads
    const warmLeads = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.is_deleted = :deleted', { deleted: false })
      .andWhere('c.priority = :priority', { priority: 'warm' })
      .getCount();

    // Cold leads
    const coldLeads = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.is_deleted = :deleted', { deleted: false })
      .andWhere('c.priority = :priority', { priority: 'cold' })
      .getCount();

    // Today's active tasks (tasks due today that are not completed)
    let todayActiveTasks = 0;
    try {
      todayActiveTasks = await this.taskRepository
        .createQueryBuilder('t')
        .where('t.dueDate >= :today', { today })
        .andWhere('t.dueDate < :tomorrow', { tomorrow })
        .andWhere('t.status != :completed', { completed: 'completed' })
        .getCount();
    } catch (e) {
      console.error('Error getting today active tasks:', e);
    }

    // Today's total calls (call tasks scheduled for today)
    let todayTotalCalls = 0;
    try {
      todayTotalCalls = await this.callTaskRepository
        .createQueryBuilder('ct')
        .where('ct.scheduledDate >= :today', { today })
        .andWhere('ct.scheduledDate < :tomorrow', { tomorrow })
        .getCount();
    } catch (e) {
      console.error('Error getting today calls:', e);
    }

    // Today's completed calls
    let todayCompletedCalls = 0;
    try {
      todayCompletedCalls = await this.callTaskRepository
        .createQueryBuilder('ct')
        .where('ct.scheduledDate >= :today', { today })
        .andWhere('ct.scheduledDate < :tomorrow', { tomorrow })
        .andWhere('ct.status = :completed', { completed: 'completed' })
        .getCount();
    } catch (e) {
      console.error('Error getting today completed calls:', e);
    }

    // Overdue tasks
    let overdueTasks = 0;
    try {
      overdueTasks = await this.taskRepository
        .createQueryBuilder('t')
        .where('t.dueDate < :today', { today })
        .andWhere('t.status != :completed', { completed: 'completed' })
        .getCount();
    } catch (e) {
      console.error('Error getting overdue tasks:', e);
    }

    // Recent leads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLeads = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.is_deleted = :deleted', { deleted: false })
      .andWhere('c.createdAt >= :since', { since: sevenDaysAgo })
      .getCount();

    return {
      totalCustomers,
      hotLeads,
      warmLeads,
      coldLeads,
      todayActiveTasks,
      todayTotalCalls,
      todayCompletedCalls,
      overdueTasks,
      recentLeads,
    };
  }
}
