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

  // ==================== AI-STYLE CALL SCRIPT SUGGESTIONS ====================

  private chooseScriptKey(intel: any, task: CallTask) {
    const totalOrders = Number(intel?.total_orders || 0);
    const lifetimeValue = Number(intel?.lifetime_value || 0);
    const avgOrderValue = Number(intel?.avg_order_value || 0);
    const daysSinceLastOrder = Number(intel?.days_since_last_order || 0);

    const isVip = lifetimeValue >= 20000 || avgOrderValue >= 3000;
    const isPermanent = totalOrders >= 8;

    const reason = String(task.call_reason || '').toLowerCase();
    if (reason.includes('win-back') || daysSinceLastOrder >= 30) return 'winBack';
    if (reason.includes('permanent')) return 'permanentDeclaration';
    if (isVip || isPermanent) return 'vip';
    if (totalOrders <= 1) return 'new';
    if (totalOrders === 2) return 'second';
    if (totalOrders === 3) return 'third';
    return 'regular';
  }

  async getSuggestedCallScript(taskId: number) {
    const task = await this.callTaskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');

    const intel = await this.getCustomerIntelligence(task.customer_id);
    const recommendations = await this.getCustomerRecommendations(task.customer_id);

    const key = this.chooseScriptKey(intel, task);

    const opening = [
      'আসসালামু আলাইকুম। আমি TrustCart Organic Grocery থেকে বলছি।',
      'আমি কি [Customer Name] ভাই/আপু কথা বলছি?',
      '(Yes হলে) ধন্যবাদ। ১ মিনিট সময় দিলে ভালো লাগবে।',
    ];

    const ending = [
      'ধন্যবাদ আপনার সময় দেওয়ার জন্য।',
      'কোনো প্রশ্ন থাকলে যেকোনো সময় TrustCart-এ কল করতে পারেন।',
    ];

    const scripts: Record<string, { title: string; goal: string; lines: string[] } > = {
      new: {
        title: 'New Customer (1st Order)',
        goal: 'Trust build + 2nd order',
        lines: [
          'আপনি সম্প্রতি আমাদের থেকে [Product Name] নিয়েছিলেন। জানতে চাইছিলাম—কোয়ালিটি কেমন লেগেছে?',
          '(Positive হলে) আলহামদুলিল্লাহ। আমরা খাঁটি অর্গানিক প্রোডাক্ট নিয়ে কাজ করি, যেন বাজারের ভেজাল থেকে পরিবারকে নিরাপদ রাখা যায়।',
          'আপনি যেহেতু নতুন কাস্টমার, আপনার জন্য একটা ছোট বিশেষ ছাড় চালু আছে। চাইলে আজই আবার অর্ডার করতে পারেন।',
        ],
      },
      second: {
        title: 'Second-Time Customer (Reminder)',
        goal: 'Habit build + reminder',
        lines: [
          'আপনি গতবার [Product + Quantity] নিয়েছিলেন। সাধারণত এই পরিমাণে প্রায় [X] দিন ব্যবহার হয়।',
          'তাই ভাবলাম সময়মতো মনে করিয়ে দেই, যেন হঠাৎ শেষ হয়ে না যায়।',
          'এই প্রোডাক্টের সাথে অনেক কাস্টমার [Related Product] নিচ্ছেন। চাইলে আপনাকে কম্বো অফার দিতে পারি।',
        ],
      },
      third: {
        title: 'Third-Time Customer (Membership Intro)',
        goal: 'Loyalty entry + membership intro',
        lines: [
          'আপনি আমাদের নিয়মিত কাস্টমার হয়ে যাচ্ছেন, এজন্য আপনাকে ধন্যবাদ।',
          'এই পর্যায়ে আমরা Membership সুবিধা দেই—ডিসকাউন্ট, বিশেষ অফার আর অগ্রাধিকার ডেলিভারি।',
          'আপনি চাইলে পরের অর্ডার থেকেই এই সুবিধা নিতে পারবেন।',
        ],
      },
      regular: {
        title: 'Regular / Medium Customer',
        goal: 'Upsell + combo',
        lines: [
          'আপনি নিয়মিত আমাদের থেকে কেনাকাটা করেন, এজন্য আমরা আপনাকে আলাদা করে গুরুত্ব দেই।',
          'বাজারে যেসব পণ্যে ভেজাল বেশি, আমরা সেগুলো নিয়েই বেশি কাজ করছি।',
          'এই মাসে আপনার জন্য একটা Save More Combo আছে। একসাথে নিলে খরচ কম পড়বে।',
        ],
      },
      vip: {
        title: 'VIP / Permanent Customer',
        goal: 'Retention + exclusivity',
        lines: [
          'আপনি আমাদের প্রিমিয়াম কাস্টমার, এজন্য ধন্যবাদ। এই অফারটা সাধারণ কাস্টমারের জন্য না।',
          'আপনার জন্য আমরা Early Access দিচ্ছি নতুন প্রোডাক্টে।',
          'আপনি চাইলে আজকেই অর্ডার কনফার্ম করে রাখছি।',
        ],
      },
      winBack: {
        title: 'Inactive / Lost Customer (Win-back)',
        goal: 'Re-engage',
        lines: [
          'কিছুদিন ধরে আপনার কোনো অর্ডার পাইনি। ভাবলাম খোঁজ নিই—কোনো সমস্যা হয়েছিল কি?',
          'আমরা চাই আপনি ভালো সার্ভিস পান।',
          'এই সপ্তাহে আপনার জন্য একটা Comeback Discount আছে। চাইলে আজকেই অর্ডার করতে পারেন।',
        ],
      },
      permanentDeclaration: {
        title: 'Permanent Customer Declaration',
        goal: 'Celebrate + retention lock-in',
        lines: [
          'অভিনন্দন! আপনি এখন TrustCart Permanent Customer।',
          'এর মানে আপনি আজীবন বিশেষ ছাড়, প্রাইওরিটি ডেলিভারি আর এক্সক্লুসিভ অফার পাবেন।',
          'আমরা আপনাকে শুধু কাস্টমার না, পরিবারের একজন মনে করি।',
        ],
      },
    };

    const chosen = scripts[key] || scripts.regular;

    const objectionHandling = [
      { objection: 'দাম বেশি', reply: 'বুঝতে পারছি। তবে আমরা ভেজালমুক্ত অর্গানিক দেই—লং টার্মে এটা আসলে সাশ্রয়ী।' },
      { objection: 'পরে নিব', reply: 'সমস্যা নেই। আমি আপনার জন্য রিমাইন্ডার সেট করে দিচ্ছি।' },
    ];

    return {
      taskId: task.id,
      scriptKey: key,
      opening,
      main: chosen,
      objectionHandling,
      ending,
      context: {
        callReason: task.call_reason,
        priority: task.priority,
        customerIntel: intel,
        recommendations,
      },
    };
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
