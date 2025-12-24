import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallTask, TaskPriority, TaskStatus } from './entities/call-task.entity';
import { EngagementHistory } from './entities/engagement-history.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { MarketingCampaign } from './entities/marketing-campaign.entity';

@Injectable()
export class CrmAutomationService {
  constructor(
    @InjectRepository(CallTask)
    private callTaskRepo: Repository<CallTask>,
    
    @InjectRepository(EngagementHistory)
    private engagementRepo: Repository<EngagementHistory>,
    
    @InjectRepository(RecommendationRule)
    private recommendationRepo: Repository<RecommendationRule>,
    
    @InjectRepository(MarketingCampaign)
    private campaignRepo: Repository<MarketingCampaign>,
  ) {}

  // ==================== CALL TASK MANAGEMENT ====================
  
  async getTodayCallTasks(agentId?: number) {
    const where: any = {
      task_date: new Date().toISOString().split('T')[0],
      status: TaskStatus.PENDING
    };
    
    if (agentId) {
      where.assigned_agent_id = agentId;
    }
    
    const tasks = await this.callTaskRepo.find({
      where,
      order: {
        priority: 'ASC', // hot first
        created_at: 'ASC'
      }
    });
    
    return tasks;
  }
  
  async updateCallTaskStatus(taskId: number, status: TaskStatus, outcome?: string, notes?: string) {
    const task = await this.callTaskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }
    
    task.status = status;
    if (outcome) task.call_outcome = outcome;
    if (notes) task.notes = notes;
    
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      task.completed_at = new Date();
    }
    
    return await this.callTaskRepo.save(task);
  }
  
  async assignCallTask(taskId: number, agentId: number) {
    const task = await this.callTaskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }
    
    task.assigned_agent_id = agentId;
    task.status = TaskStatus.IN_PROGRESS;
    
    return await this.callTaskRepo.save(task);
  }
  
  // ==================== CUSTOMER INTELLIGENCE ====================
  
  async getCustomerIntelligence(customerId: string) {
    const results = await this.callTaskRepo.query(`
      SELECT * FROM customer_intelligence WHERE customer_id = $1
    `, [customerId]);
    
    return results[0] || null;
  }
  
  async getHotCustomers(limit: number = 20) {
    const results = await this.callTaskRepo.query(`
      SELECT * FROM customer_intelligence 
      WHERE customer_temperature = 'hot'
      ORDER BY lifetime_value DESC
      LIMIT $1
    `, [limit]);
    
    return results;
  }
  
  async getWarmCustomers(limit: number = 30) {
    const results = await this.callTaskRepo.query(`
      SELECT * FROM customer_intelligence 
      WHERE customer_temperature = 'warm'
      ORDER BY lifetime_value DESC
      LIMIT $1
    `, [limit]);
    
    return results;
  }
  
  async getColdCustomers(limit: number = 50) {
    const results = await this.callTaskRepo.query(`
      SELECT * FROM customer_intelligence 
      WHERE customer_temperature = 'cold'
      ORDER BY last_purchase_date DESC
      LIMIT $1
    `, [limit]);
    
    return results;
  }
  
  // ==================== PRODUCT RECOMMENDATIONS ====================
  
  async getCustomerRecommendations(customerId: string) {
    const results = await this.callTaskRepo.query(`
      SELECT * FROM customer_product_recommendations 
      WHERE customer_id = $1
      ORDER BY priority ASC
    `, [customerId]);
    
    return results;
  }
  
  async getAllRecommendationRules() {
    return await this.recommendationRepo.find({
      where: { is_active: true },
      order: { priority: 'ASC' }
    });
  }
  
  async createRecommendationRule(data: Partial<RecommendationRule>) {
    const rule = this.recommendationRepo.create(data);
    return await this.recommendationRepo.save(rule);
  }
  
  async updateRecommendationRule(id: number, data: Partial<RecommendationRule>) {
    await this.recommendationRepo.update(id, data);
    return await this.recommendationRepo.findOne({ where: { id } });
  }
  
  async deleteRecommendationRule(id: number) {
    return await this.recommendationRepo.delete(id);
  }
  
  // ==================== ENGAGEMENT TRACKING ====================
  
  async trackEngagement(data: Partial<EngagementHistory>) {
    const engagement = this.engagementRepo.create(data);
    return await this.engagementRepo.save(engagement);
  }
  
  async getCustomerEngagementHistory(customerId: string, limit: number = 50) {
    return await this.engagementRepo.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
      take: limit
    });
  }
  
  async getEngagementStats(customerId: string) {
    const results = await this.engagementRepo.query(`
      SELECT 
        engagement_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'responded') as responded,
        COUNT(*) FILTER (WHERE status = 'ignored') as ignored
      FROM customer_engagement_history
      WHERE customer_id = $1
      GROUP BY engagement_type
    `, [customerId]);
    
    return results;
  }
  
  // ==================== MARKETING CAMPAIGNS ====================
  
  async getAllCampaigns() {
    return await this.campaignRepo.find({
      order: { created_at: 'DESC' }
    });
  }
  
  async getActiveCampaigns() {
    return await this.campaignRepo.find({
      where: { is_active: true },
      order: { created_at: 'DESC' }
    });
  }
  
  async createCampaign(data: Partial<MarketingCampaign>) {
    const campaign = this.campaignRepo.create(data);
    return await this.campaignRepo.save(campaign);
  }
  
  async updateCampaign(id: number, data: Partial<MarketingCampaign>) {
    await this.campaignRepo.update(id, data);
    return await this.campaignRepo.findOne({ where: { id } });
  }
  
  async toggleCampaign(id: number, isActive: boolean) {
    await this.campaignRepo.update(id, { is_active: isActive });
    return await this.campaignRepo.findOne({ where: { id } });
  }
  
  async deleteCampaign(id: number) {
    return await this.campaignRepo.delete(id);
  }
  
  async getCampaignStats(campaignId: number) {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    const engagements = await this.engagementRepo.count({
      where: { campaign_id: campaignId }
    });
    
    return {
      ...campaign,
      total_sent: engagements,
      conversion_rate: campaign.success_count > 0 
        ? ((campaign.success_count / engagements) * 100).toFixed(2) 
        : 0
    };
  }
  
  // ==================== AUTO TASK GENERATION ====================
  
  async generateDailyCallTasks() {
    try {
      await this.callTaskRepo.query('SELECT generate_daily_call_tasks()');
      return { success: true, message: 'Daily call tasks generated successfully' };
    } catch (error) {
      console.error('Error generating daily call tasks:', error);
      throw error;
    }
  }
  
  // ==================== AGENT PERFORMANCE ====================
  
  async getAgentPerformance(agentId?: number) {
    let query = 'SELECT * FROM agent_performance_dashboard';
    const params: any[] = [];
    
    if (agentId) {
      query += ' WHERE agent_id = $1';
      params.push(agentId);
    }
    
    const results = await this.callTaskRepo.query(query, params);
    return results;
  }
  
  async getAgentDashboard(agentId: number) {
    const todayTasks = await this.getTodayCallTasks(agentId);
    const performance = await this.getAgentPerformance(agentId);
    
    const hotTasks = todayTasks.filter(t => t.priority === TaskPriority.HOT);
    const warmTasks = todayTasks.filter(t => t.priority === TaskPriority.WARM);
    
    return {
      today_tasks: todayTasks.length,
      hot_leads: hotTasks.length,
      warm_leads: warmTasks.length,
      pending: todayTasks.filter(t => t.status === TaskStatus.PENDING).length,
      completed: todayTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      performance: performance[0] || {},
      tasks: todayTasks
    };
  }
  
  // ==================== WHAT TO DO NEXT ====================
  
  async getNextBestAction(agentId: number) {
    const todayTasks = await this.getTodayCallTasks(agentId);
    
    if (todayTasks.length === 0) {
      return {
        action: 'no_tasks',
        message: 'No pending tasks for today. Great job!',
        suggestion: 'Review yesterday\'s incomplete tasks or check warm leads.'
      };
    }
    
    // Priority: HOT customers first
    const hotTask = todayTasks.find(t => t.priority === TaskPriority.HOT);
    if (hotTask) {
      const intelligence = await this.getCustomerIntelligence(hotTask.customer_id);
      const recommendations = await this.getCustomerRecommendations(hotTask.customer_id);
      
      return {
        action: 'call_hot_customer',
        priority: 'HIGH',
        task: hotTask,
        customer_intel: intelligence,
        recommendations: recommendations,
        message: `Call ${intelligence?.name || 'customer'} NOW - High-value customer!`,
        products_to_push: recommendations.map((r: any) => r.recommended_product_name).slice(0, 3)
      };
    }
    
    // Next: WARM customers
    const warmTask = todayTasks.find(t => t.priority === TaskPriority.WARM);
    if (warmTask) {
      const intelligence = await this.getCustomerIntelligence(warmTask.customer_id);
      
      return {
        action: 'call_warm_customer',
        priority: 'MEDIUM',
        task: warmTask,
        customer_intel: intelligence,
        message: `Follow up with ${intelligence?.name || 'customer'}`,
      };
    }
    
    return {
      action: 'check_cold_leads',
      priority: 'LOW',
      message: 'All hot/warm leads contacted. Review cold leads or update CRM.'
    };
  }
}
