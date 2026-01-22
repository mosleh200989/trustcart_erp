import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { SalesTeam } from './entities/sales-team.entity';
import { User } from '../users/user.entity';
import { CallTask, TaskPriority, TaskStatus } from './entities/call-task.entity';
import { Activity } from './entities/activity.entity';

export enum LeadPriority {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

@Injectable()
export class CrmTeamService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(SalesTeam)
    private salesTeamRepository: Repository<SalesTeam>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(CallTask)
    private callTaskRepo: Repository<CallTask>,
    @InjectRepository(Activity)
    private activityRepo: Repository<Activity>,
  ) {}

  private getDateString(date?: string | Date): string {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  }

  private getPurchaseStage(orderCount: number): 'new' | 'repeat_2' | 'repeat_3' | 'regular' | 'permanent' {
    if (orderCount <= 1) return 'new';
    if (orderCount === 2) return 'repeat_2';
    if (orderCount === 3) return 'repeat_3';
    if (orderCount >= 8) return 'permanent';
    return 'regular';
  }

  private getValueStage(totalSpent: number, avgOrderValue: number): 'normal' | 'medium' | 'vip' {
    // Defaults (can be tuned later): VIP = high spend or high AOV, Medium = regular buyer.
    if (totalSpent >= 20000 || avgOrderValue >= 3000) return 'vip';
    if (totalSpent >= 8000 || avgOrderValue >= 1500) return 'medium';
    return 'normal';
  }

  private mapSegmentToTeamCode(segment: {
    purchaseStage: string;
    valueStage: string;
  }): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (segment.valueStage === 'vip' || segment.purchaseStage === 'permanent') return 'E';
    if (segment.purchaseStage === 'new') return 'A';
    if (segment.purchaseStage === 'repeat_2') return 'B';
    if (segment.purchaseStage === 'repeat_3') return 'C';
    return 'D';
  }

  private async getLeaderAgentsByTeamCode(teamLeaderId: number): Promise<Record<string, number[]>> {
    // Uses SalesTeam.code as A–E. TL creates teams and assigns agents in /admin/crm/teams.
    const teams = await this.salesTeamRepository.find({ where: { teamLeaderId } });
    const byCode: Record<string, number[]> = { A: [], B: [], C: [], D: [], E: [], OTHER: [] };

    for (const team of teams) {
      const code = (team.code || 'OTHER').toUpperCase();
      const members = await this.usersRepository.find({ where: { teamId: team.id, status: 'active' as any } });
      const ids = members.map((m) => m.id);
      if (code in byCode) {
        byCode[code].push(...ids);
      } else {
        byCode.OTHER.push(...ids);
      }
    }

    // Fallback: any agent under TL even if not assigned to a SalesTeam
    const fallbackAgents = await this.usersRepository.find({ where: { teamLeaderId, status: 'active' as any } });
    const fallbackIds = fallbackAgents.map((a) => a.id);
    byCode.OTHER = Array.from(new Set([...byCode.OTHER, ...fallbackIds]));

    return byCode;
  }

  private async getLeaderCustomers(teamLeaderId: number): Promise<Customer[]> {
    // Customer coverage for TL = customers directly supervised OR customers assigned to TL agents.
    // Uses phone-based join for sales analytics because sales_orders is int-based in many installs.
    const agentIds = (await this.usersRepository.find({ where: { teamLeaderId } })).map((u) => u.id);
    const qb = this.customerRepository.createQueryBuilder('c');
    qb.where('c.assigned_supervisor_id = :tl', { tl: teamLeaderId });
    if (agentIds.length > 0) {
      qb.orWhere('c.assigned_to IN (:...agentIds)', { agentIds });
    }
    qb.andWhere('c.is_active = true');
    qb.andWhere('c.phone IS NOT NULL');
    return qb.getMany();
  }

  private async computeSegmentsForCustomers(customers: Customer[]) {
    const phones = customers.map((c) => c.phone).filter(Boolean);
    if (phones.length === 0) {
      return [] as Array<{
        customer: Customer;
        orderCount: number;
        totalSpent: number;
        avgOrderValue: number;
        lastOrderDate: string | null;
        purchaseStage: ReturnType<CrmTeamService['getPurchaseStage']>;
        valueStage: ReturnType<CrmTeamService['getValueStage']>;
      }>;
    }

    // Aggregate orders by customer phone.
    const statsRows = await this.customerRepository.query(
      `
      SELECT
        so.customer_phone AS phone,
        COUNT(DISTINCT so.id)::int AS order_count,
        COALESCE(SUM(so.total_amount), 0)::numeric AS total_spent,
        COALESCE(AVG(so.total_amount), 0)::numeric AS avg_order_value,
        MAX(so.order_date)::date AS last_order_date
      FROM sales_orders so
      WHERE so.customer_phone = ANY($1)
      GROUP BY so.customer_phone
      `,
      [phones],
    );

    const statsByPhone = new Map<string, any>();
    for (const r of statsRows) {
      if (r.phone) statsByPhone.set(String(r.phone), r);
    }

    return customers.map((customer) => {
      const row = statsByPhone.get(String(customer.phone));
      const orderCount = row ? Number(row.order_count || 0) : 0;
      const totalSpent = row ? Number(row.total_spent || 0) : 0;
      const avgOrderValue = row ? Number(row.avg_order_value || 0) : 0;
      const lastOrderDate = row && row.last_order_date ? String(row.last_order_date) : null;
      const purchaseStage = this.getPurchaseStage(orderCount);
      const valueStage = this.getValueStage(totalSpent, avgOrderValue);
      return { customer, orderCount, totalSpent, avgOrderValue, lastOrderDate, purchaseStage, valueStage };
    });
  }

  // ==================== LEAD ASSIGNMENT ====================
  async assignLeadToAgent(customerId: string, agentId: number, teamLeaderId: number): Promise<Customer> {
    const customerIdNum = Number(customerId);
    const customer = await this.customerRepository.findOne({ where: { id: customerIdNum } });
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Store assignment info in customer metadata or create separate table
    customer.assigned_to = agentId;
    customer.assigned_supervisor_id = teamLeaderId;
    customer.updatedAt = new Date();

    return await this.customerRepository.save(customer);
  }

  async reassignCustomer(customerId: string, newAgentId: number, teamLeaderId: number): Promise<Customer> {
    return await this.assignLeadToAgent(customerId, newAgentId, teamLeaderId);
  }

  async setLeadPriority(customerId: string, priority: LeadPriority): Promise<Customer> {
    const customerIdNum = Number(customerId);
    const customer = await this.customerRepository.findOne({ where: { id: customerIdNum } });
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Store priority in customer metadata
    customer.priority = priority;
    customer.updatedAt = new Date();

    return await this.customerRepository.save(customer);
  }

  // ==================== TEAM MONITORING ====================
  async getTeamLeads(teamLeaderId: number, query: any = {}): Promise<{ data: Customer[], total: number }> {
    const { page = 1, limit = 20, priority, status } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // IMPORTANT: "Unassigned Leads" should include ALL customers (even those who already ordered)
    // and not be restricted to lifecycle_stage='lead'.
    // We treat "unassigned lead" as any active customer not yet assigned to an agent.
    const qb = this.customerRepository.createQueryBuilder('c');
    qb.where('c.is_deleted = false');
    qb.andWhere('c.is_active = true');
    qb.andWhere('c.assigned_to IS NULL');

    // Scope: TL can see customers they supervise, plus globally-unclaimed customers.
    qb.andWhere('(c.assigned_supervisor_id IS NULL OR c.assigned_supervisor_id = :tl)', { tl: teamLeaderId });

    if (priority) {
      qb.andWhere('c.priority = :priority', { priority });
    }
    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    qb.orderBy('c.created_at', 'DESC');
    qb.skip(skip).take(limitNum);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async convertLeadToCustomer(customerId: string, actorUserId: number): Promise<Customer> {
    const customerIdNum = Number(customerId);
    if (!Number.isFinite(customerIdNum)) {
      throw new NotFoundException('Customer not found');
    }

    const customer = await this.customerRepository.findOne({ where: { id: customerIdNum } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    if (String((customer as any).lifecycleStage || '').toLowerCase() !== 'lead') {
      // Idempotent: already converted (or was never a lead)
      return customer;
    }

    (customer as any).lifecycleStage = 'customer';
    if (!(customer as any).status) (customer as any).status = 'active';
    (customer as any).isActive = true;
    (customer as any).updatedAt = new Date();

    const saved = await this.customerRepository.save(customer);

    // Best-effort audit log in activities
    try {
      const activity = this.activityRepo.create({
        type: 'lead_converted',
        customerId: (saved as any).id,
        userId: actorUserId,
        subject: 'Lead converted to customer',
        description: `Lead lifecycle_stage changed to 'customer' by user ${actorUserId}.`,
        outcome: 'converted',
        completedAt: new Date(),
        metadata: {
          from: 'lead',
          to: 'customer',
          actorUserId,
        },
      } as any);

      await this.activityRepo.save(activity as any);
    } catch {
      // never block conversion if logging fails
    }

    return saved;
  }

  async getAgentCustomers(agentId: number, query: any = {}): Promise<{ data: Customer[], total: number }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.customerRepository.findAndCount({
      where: { assigned_to: agentId, is_deleted: false, isActive: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit
    });

    return { data, total };
  }

  async getAgentCustomersForRequester(
    requester: { id: number; roleSlug?: string | null },
    agentId: number,
    query: any = {},
  ): Promise<{ data: Customer[]; total: number }> {
    if (!requester?.id || !Number.isFinite(Number(requester.id))) {
      throw new ForbiddenException('Invalid requester');
    }
    if (!agentId || !Number.isFinite(Number(agentId))) {
      throw new NotFoundException('Agent not found');
    }

    // Agent can always view their own assigned customers.
    if (Number(requester.id) === Number(agentId)) {
      return this.getAgentCustomers(agentId, query);
    }

    const roleSlug = String(requester.roleSlug || '').toLowerCase();
    const isAdmin = roleSlug === 'admin' || roleSlug === 'super-admin';
    if (isAdmin) {
      return this.getAgentCustomers(agentId, query);
    }

    // Team leader can view customers of agents under them.
    const agent = await this.usersRepository.findOne({
      where: { id: agentId, isDeleted: false } as any,
      select: ['id', 'teamLeaderId', 'status', 'isDeleted'] as any,
    });

    if (!agent || (agent as any).isDeleted) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.teamLeaderId && Number(agent.teamLeaderId) === Number(requester.id)) {
      return this.getAgentCustomers(agentId, query);
    }

    throw new ForbiddenException('You are not allowed to view this agent\'s customers');
  }

  async getTeamPerformance(teamLeaderId: number): Promise<any> {
    // Get all teams under this team leader
    const teams = await this.salesTeamRepository.find({ where: { teamLeaderId } });

    // For each team, count telesales agents (users) in that team
    const teamSummaries = [] as any[];
    let totalMembers = 0;

    for (const team of teams) {
      const members = await this.usersRepository.find({ where: { teamId: team.id } });
      const memberCount = members.length;
      totalMembers += memberCount;

      teamSummaries.push({
        teamId: team.id,
        teamName: team.name,
        memberCount,
        // Placeholders for future detailed performance metrics per team
        totalLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
      });
    }

    return {
      totalTeams: teams.length,
      totalMembers,
      teams: teamSummaries,
    };
  }

  async getMissedFollowups(teamLeaderId: number): Promise<any[]> {
    // Implementation for missed follow-ups tracking
    return [];
  }

  async getEscalatedCustomers(teamLeaderId: number): Promise<Customer[]> {
    // Get customers marked for escalation
    return await this.customerRepository.find({
      where: { is_escalated: true, is_deleted: false, isActive: true },
      order: { escalated_at: 'DESC' }
    });
  }

  // ==================== ANALYTICS ====================
  async getTeamLeaderDashboard(teamLeaderId: number): Promise<any> {
    const today = this.getDateString();
    const customers = await this.getLeaderCustomers(teamLeaderId);
    const segments = await this.computeSegmentsForCustomers(customers);

    const purchaseStageCounts: Record<string, number> = {
      new: 0,
      repeat_2: 0,
      repeat_3: 0,
      regular: 0,
      permanent: 0,
    };
    const valueStageCounts: Record<string, number> = { normal: 0, medium: 0, vip: 0 };
    let repeatCustomers = 0;
    let vipPermanent = 0;
    let vipPermanentActive30 = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    for (const s of segments) {
      purchaseStageCounts[s.purchaseStage] = (purchaseStageCounts[s.purchaseStage] || 0) + 1;
      valueStageCounts[s.valueStage] = (valueStageCounts[s.valueStage] || 0) + 1;
      if (s.orderCount >= 2) repeatCustomers += 1;
      const isVipOrPermanent = s.valueStage === 'vip' || s.purchaseStage === 'permanent';
      if (isVipOrPermanent) {
        vipPermanent += 1;
        if (s.lastOrderDate && s.lastOrderDate >= thirtyDaysAgoStr) {
          vipPermanentActive30 += 1;
        }
      }
    }

    const tasksToday = await this.callTaskRepo.query(
      `
      SELECT
        assigned_agent_id,
        status,
        COUNT(*)::int AS cnt
      FROM crm_call_tasks
      WHERE task_date = $1
      GROUP BY assigned_agent_id, status
      `,
      [today],
    );

    const tasksPendingPrev = await this.callTaskRepo.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM crm_call_tasks
      WHERE task_date < $1 AND status = 'pending'
      `,
      [today],
    );

    const agentPerformance = await this.callTaskRepo.query(
      `
      SELECT
        assigned_agent_id AS agent_id,
        COUNT(*) FILTER (WHERE task_date = $1)::int AS total_today,
        COUNT(*) FILTER (WHERE task_date = $1 AND status = 'completed')::int AS completed_today,
        COUNT(*) FILTER (WHERE task_date = $1 AND status = 'failed')::int AS failed_today
      FROM crm_call_tasks
      WHERE task_date = $1
      GROUP BY assigned_agent_id
      ORDER BY total_today DESC
      `,
      [today],
    );

    const repeatRate = customers.length > 0 ? Number(((repeatCustomers / customers.length) * 100).toFixed(2)) : 0;
    const vipRetention30 = vipPermanent > 0 ? Number(((vipPermanentActive30 / vipPermanent) * 100).toFixed(2)) : 0;

    const scripts = {
      commonOpening: {
        title: 'Common Call Opening (সব কলের শুরুতে)',
        lines: [
          'আসসালামু আলাইকুম। আমি TrustCart Organic Grocery থেকে বলছি।',
          'আমি কি [Customer Name] ভাই/আপু কথা বলছি?',
          '(Yes হলে) ধন্যবাদ। ১ মিনিট সময় দিলে ভালো লাগবে।',
        ],
      },
      A: {
        title: '1) New Customer (১ম অর্ডার)',
        goal: 'Trust build + 2nd order',
        style: ['Friendly', 'Educative', 'No pressure'],
        script: [
          'আপনি সম্প্রতি আমাদের থেকে [Product Name] নিয়েছিলেন।',
          'জানতে চাইছিলাম—প্রোডাক্টের কোয়ালিটি কেমন লেগেছে?',
          '(Positive হলে) আলহামদুলিল্লাহ। আমরা খাঁটি অর্গানিক প্রোডাক্ট নিয়ে কাজ করি, যেন বাজারের ভেজাল থেকে পরিবারকে নিরাপদ রাখা যায়।',
          'আপনি যেহেতু নতুন কাস্টমার, আপনার জন্য একটা ছোট বিশেষ ছাড় চালু আছে। চাইলে আজই আবার অর্ডার করতে পারেন।',
        ],
      },
      B: {
        title: '2) Second-Time Customer (২য় অর্ডার)',
        goal: 'Habit build + reminder',
        style: ['Solution based', 'Consumption reminder'],
        script: [
          'আপনি গতবার [Product + Quantity] নিয়েছিলেন। সাধারণত এই পরিমাণে প্রায় [X] দিন ব্যবহার হয়।',
          'তাই ভাবলাম সময়মতো মনে করিয়ে দেই, যেন হঠাৎ শেষ হয়ে না যায়।',
          'এই প্রোডাক্টের সাথে অনেক কাস্টমার [Related Product] নিচ্ছেন। চাইলে আপনাকে কম্বো অফার দিতে পারি।',
        ],
      },
      C: {
        title: '3) Third-Time Customer (৩য় অর্ডার)',
        goal: 'Loyalty entry + membership intro',
        style: ['Benefit driven', 'Membership intro'],
        script: [
          'আপনি আমাদের নিয়মিত কাস্টমার হয়ে যাচ্ছেন, এজন্য আপনাকে ধন্যবাদ।',
          'আমরা এমন কাস্টমারদের জন্য Membership সুবিধা দেই।',
          'মেম্বার হলে নিয়মিত ডিসকাউন্ট, বিশেষ অফার আর অগ্রাধিকার ডেলিভারি পাবেন।',
          'আজকের অর্ডারের সাথে এই সুবিধাটা নিতে চান?',
        ],
      },
      D: {
        title: '4) Regular / Medium Customer',
        goal: 'Upsell + combo',
        style: ['Value comparison', 'Combo offer'],
        script: [
          'আপনি নিয়মিত আমাদের থেকে কেনাকাটা করেন, এজন্য আমরা আপনাকে আলাদা করে গুরুত্ব দেই।',
          'বাজারে যেসব পণ্যে ভেজাল বেশি, আমরা সেগুলো নিয়েই বেশি কাজ করছি।',
          'এই মাসে আপনার জন্য একটা Save More Combo আছে। একসাথে নিলে খরচ কম পড়বে।',
        ],
      },
      E: {
        title: '5) VIP / Permanent Customer',
        goal: 'Retention + exclusivity',
        style: ['Respectful', 'Exclusive'],
        script: [
          'আপনি আমাদের প্রিমিয়াম কাস্টমার, এজন্য ধন্যবাদ। এই অফারটা সাধারণ কাস্টমারের জন্য না।',
          'আপনার জন্য আমরা Early Access দিচ্ছি নতুন প্রোডাক্টে।',
          'আপনি চাইলে আজকেই অর্ডার কনফার্ম করে রাখছি।',
        ],
      },
      winBack: {
        title: '6) Inactive / Lost Customer (Win-back)',
        goal: 'Re-engage',
        style: ['Empathy', 'Service recovery', 'Win-back offer'],
        script: [
          'কিছুদিন ধরে আপনার কোনো অর্ডার পাইনি। ভাবলাম খোঁজ নিই—কোনো সমস্যা হয়েছিল কি?',
          'আমরা চাই আপনি ভালো সার্ভিস পান।',
          'এই সপ্তাহে আপনার জন্য একটা Comeback Discount আছে। চাইলে আজকেই অর্ডার করতে পারেন।',
        ],
      },
      permanentDeclaration: {
        title: '7) Permanent Customer Declaration Call',
        goal: 'Celebrate + retention lock-in',
        style: ['Celebratory', 'Respectful', 'Emotional close'],
        script: [
          'অভিনন্দন! আপনি এখন TrustCart Permanent Customer।',
          'এর মানে আপনি আজীবন বিশেষ ছাড়, প্রাইওরিটি ডেলিভারি আর এক্সক্লুসিভ অফার পাবেন।',
          'আমরা আপনাকে শুধু কাস্টমার না, পরিবারের একজন মনে করি।',
        ],
      },
      objectionHandling: {
        title: 'Objection Handling (কমন আপত্তি)',
        items: [
          {
            objection: 'দাম বেশি',
            reply: 'বুঝতে পারছি। তবে আমরা ভেজালমুক্ত অর্গানিক দেই—লং টার্মে এটা আসলে সাশ্রয়ী।',
          },
          {
            objection: 'পরে নিব',
            reply: 'সমস্যা নেই। আমি আপনার জন্য রিমাইন্ডার সেট করে দিচ্ছি।',
          },
        ],
      },
      callEnding: {
        title: 'Call Ending (সব কলের শেষে)',
        lines: [
          'ধন্যবাদ আপনার সময় দেওয়ার জন্য।',
          'কোনো প্রশ্ন থাকলে যেকোনো সময় TrustCart-এ কল করতে পারেন।',
        ],
      },
      universal: {
        title: 'Universal Call Flow (AIDA)',
        flow: ['Relationship opener', 'Need/usage reminder', 'Problem awareness', 'Solution offer', 'Soft close'],
      },
    };

    const trainingRolePlays = {
      title: 'Agent Training – Role Play Scripts (Bangla)',
      format: 'Trainer (TL) + Agent + Customer',
      rolePlays: [
        {
          id: 'RP1',
          title: 'ROLE PLAY–1 : New Customer (1st Order)',
          trainingGoal: ['কাস্টমারকে চাপ না দেওয়া', 'Trust build করা', '2nd order-এর দরজা খোলা'],
          script: [
            { speaker: 'TL (Customer)', line: 'হ্যালো, কে বলছেন?' },
            {
              speaker: 'Agent',
              line: 'আসসালামু আলাইকুম। আমি TrustCart Organic Grocery থেকে বলছি। আমি কি মোহাম্মদ রাশেদ ভাইয়ের সাথে কথা বলছি?',
            },
            { speaker: 'TL (Customer)', line: 'হ্যাঁ, বলুন।' },
            { speaker: 'Agent', line: 'আপনি সম্প্রতি আমাদের থেকে অর্গানিক চাল নিয়েছিলেন। জানতে চাইছিলাম—কোয়ালিটি কেমন লেগেছে?' },
            { speaker: 'TL (Customer)', line: 'ভালোই ছিল।' },
            {
              speaker: 'Agent (Correct Tone)',
              line: 'আলহামদুলিল্লাহ। আমরা খাঁটি পণ্য দেওয়ার চেষ্টা করি, যেন পরিবার নিরাপদ থাকে।',
            },
            {
              speaker: 'Agent',
              line: 'আপনি যেহেতু নতুন কাস্টমার, আপনার জন্য একটা ছোট ডিসকাউন্ট আছে। চাইলে আমি ডিটেইলস জানাতে পারি।',
            },
          ],
          notes: ['❌ এখনই দাম বা অর্ডার চাপ দিবে না'],
        },
        {
          id: 'RP2',
          title: 'ROLE PLAY–2 : Second-Time Customer (Reminder Call)',
          trainingGoal: ['Natural reminder', 'Helpful tone'],
          script: [
            { speaker: 'TL (Customer)', line: 'হ্যালো।' },
            { speaker: 'Agent', line: 'আপনি গতবার ৫ কেজি চাল নিয়েছিলেন। সাধারণত এই পরিমাণে প্রায় ২৫–৩০ দিন ব্যবহার হয়।' },
            { speaker: 'TL (Customer)', line: 'হ্যাঁ।' },
            { speaker: 'Agent', line: 'তাই সময়মতো মনে করিয়ে দিচ্ছি, যেন হঠাৎ শেষ হয়ে না যায়।' },
            { speaker: 'Agent', line: 'এই চালের সাথে অনেকেই তেল নিচ্ছেন। চাইলে কম্বো অফার দিতে পারি।' },
          ],
          notes: ['✔️ “মনে করিয়ে দিচ্ছি” — এটা কাস্টমার পছন্দ করে'],
        },
        {
          id: 'RP3',
          title: 'ROLE PLAY–3 : Third-Time Customer (Membership Intro)',
          trainingGoal: ['কাস্টমারকে Special feel করানো', 'Membership explain করা'],
          script: [
            { speaker: 'TL (Customer)', line: 'আবার অর্ডার?' },
            { speaker: 'Agent', line: 'না না, আজ অর্ডারের জন্য চাপ দিচ্ছি না। আপনাকে শুধু জানাতে চাচ্ছি—আপনি এখন আমাদের রেগুলার কাস্টমার।' },
            { speaker: 'TL (Customer)', line: 'ও আচ্ছা।' },
            { speaker: 'Agent', line: 'এই পর্যায়ে আমরা Membership সুবিধা দেই—ডিসকাউন্ট, ফ্রি ডেলিভারি, আলাদা অফার।' },
            { speaker: 'Agent', line: 'আপনি চাইলে পরের অর্ডার থেকেই এই সুবিধা নিতে পারবেন।' },
          ],
          notes: ['❌ “আজই নিতেই হবে” বলা যাবে না'],
        },
        {
          id: 'RP4',
          title: 'ROLE PLAY–4 : Regular / Medium Customer (Upsell)',
          trainingGoal: ['Value based selling', 'Comparison without badmouthing market'],
          script: [
            { speaker: 'TL (Customer)', line: 'দাম একটু বেশি না?' },
            { speaker: 'Agent', line: 'বুঝতে পারছি। কিন্তু বাজারের অনেক পণ্যে ভেজাল থাকে—যা ধীরে ধীরে ক্ষতি করে।' },
            { speaker: 'TL (Customer)', line: 'হুম।' },
            { speaker: 'Agent', line: 'আমাদের প্রোডাক্ট লং টার্মে আসলে সাশ্রয়ী। এই মাসে আপনার জন্য একটা কম্বো আছে—নিলে দাম কম পড়বে।' },
          ],
        },
        {
          id: 'RP5',
          title: 'ROLE PLAY–5 : VIP / Permanent Customer',
          trainingGoal: ['Respect', 'Exclusivity', 'Relationship'],
          script: [
            { speaker: 'TL (Customer)', line: 'বলুন।' },
            { speaker: 'Agent', line: 'আপনি আমাদের প্রিমিয়াম কাস্টমার, এজন্য ধন্যবাদ। এই অফারটা সাধারণ কাস্টমারের জন্য না।' },
            { speaker: 'TL (Customer)', line: 'কী অফার?' },
            { speaker: 'Agent', line: 'নতুন অর্গানিক পণ্য এসেছে। আপনি চাইলে আগে এক্সেস পাবেন।' },
          ],
          notes: ['✔️ VIP কল = কম কথা, বেশি সম্মান'],
        },
        {
          id: 'RP6',
          title: 'ROLE PLAY–6 : Inactive Customer (Win Back)',
          trainingGoal: ['Blame না করা', 'Empathy'],
          script: [
            { speaker: 'TL (Customer)', line: 'এতদিন পর কেন কল?' },
            { speaker: 'Agent', line: 'আসলে বিক্রির জন্য না। আপনি ভালো আছেন কিনা, সেটাই জানতে চাচ্ছি।' },
            { speaker: 'TL (Customer)', line: 'ব্যস্ত ছিলাম।' },
            { speaker: 'Agent', line: 'বুঝতে পারছি। এই সপ্তাহে আপনার জন্য একটা comeback ডিসকাউন্ট আছে—চাইলে জানাবো।' },
          ],
        },
      ],
      commonMistakes: ['জোর করে অর্ডার নেওয়া', 'বেশি কথা বলা', 'দাম নিয়ে তর্ক', '“আজই শেষ” বলে ভয় দেখানো'],
      goldenRules: ['আগে সম্পর্ক, পরে বিক্রি', 'কাস্টমারের সমস্যা বলাতে দাও', 'নিজের মতামত চাপিও না', 'CRM নোট অবশ্যই আপডেট করো'],
    };

    return {
      overview: {
        totalCustomers: customers.length,
        repeatRate,
        vipRetention30,
        pendingFromPreviousDays: Number(tasksPendingPrev?.[0]?.cnt || 0),
      },
      segmentation: {
        purchaseStageCounts,
        valueStageCounts,
      },
      agentWiseCalls: agentPerformance,
      tasksTodayByStatus: tasksToday,
      teamPerformance: await this.getTeamPerformance(teamLeaderId),
      recentEscalations: await this.getEscalatedCustomers(teamLeaderId),
      scripts,
      trainingRolePlays,
    };
  }

  async generateDailyAutoCalls(teamLeaderId: number, options?: {
    date?: string;
    perAgentLimit?: number;
    reminderQuota?: number;
    offerQuota?: number;
    followupQuota?: number;
  }) {
    const date = this.getDateString(options?.date);
    const perAgentLimit = options?.perAgentLimit ?? 200;
    const reminderQuota = options?.reminderQuota ?? 120;
    const offerQuota = options?.offerQuota ?? 50;
    const followupQuota = options?.followupQuota ?? 30;

    const customers = await this.getLeaderCustomers(teamLeaderId);
    const segments = await this.computeSegmentsForCustomers(customers);

    const agentsByCode = await this.getLeaderAgentsByTeamCode(teamLeaderId);

    // Precompute existing task counts for date per agent
    const existingCounts = await this.callTaskRepo.query(
      `
      SELECT assigned_agent_id AS agent_id, COUNT(*)::int AS cnt
      FROM crm_call_tasks
      WHERE task_date = $1
      GROUP BY assigned_agent_id
      `,
      [date],
    );
    const existingByAgent = new Map<number, number>();
    for (const r of existingCounts) {
      if (r.agent_id != null) existingByAgent.set(Number(r.agent_id), Number(r.cnt || 0));
    }

    // Build candidate lists per team bucket
    type Candidate = {
      phone: string;
      customerName: string | null;
      purchaseStage: string;
      valueStage: string;
      orderCount: number;
      totalSpent: number;
      lastOrderDate: string | null;
    };

    const byTeam: Record<string, Candidate[]> = { A: [], B: [], C: [], D: [], E: [] };
    for (const s of segments) {
      const code = this.mapSegmentToTeamCode({ purchaseStage: s.purchaseStage, valueStage: s.valueStage });
      byTeam[code].push({
        phone: String(s.customer.phone),
        customerName: s.customer.name || null,
        purchaseStage: s.purchaseStage,
        valueStage: s.valueStage,
        orderCount: s.orderCount,
        totalSpent: s.totalSpent,
        lastOrderDate: s.lastOrderDate,
      });
    }

    // Sort by priority within each bucket
    const sortFn = (a: Candidate, b: Candidate) => {
      // VIP/permanent first, then higher spend, then older last order
      const aScore = (a.valueStage === 'vip' ? 1000000 : 0) + (a.purchaseStage === 'permanent' ? 500000 : 0) + a.totalSpent;
      const bScore = (b.valueStage === 'vip' ? 1000000 : 0) + (b.purchaseStage === 'permanent' ? 500000 : 0) + b.totalSpent;
      if (bScore !== aScore) return bScore - aScore;
      const aDate = a.lastOrderDate || '0000-00-00';
      const bDate = b.lastOrderDate || '0000-00-00';
      return aDate.localeCompare(bDate);
    };
    (['A', 'B', 'C', 'D', 'E'] as const).forEach((k) => byTeam[k].sort(sortFn));

    const createdTasks: any[] = [];

    const inactiveThresholdDays = 30;
    const inactiveDate = new Date(date);
    inactiveDate.setDate(inactiveDate.getDate() - inactiveThresholdDays);
    const inactiveCutoff = inactiveDate.toISOString().split('T')[0];

    const createTasksForAgent = async (agentId: number, teamCode: string) => {
      const already = existingByAgent.get(agentId) ?? 0;
      const remaining = Math.max(0, perAgentLimit - already);
      if (remaining === 0) return;

      const capReminder = Math.min(reminderQuota, remaining);
      const capOffer = Math.min(offerQuota, Math.max(0, remaining - capReminder));
      const capFollow = Math.min(followupQuota, Math.max(0, remaining - capReminder - capOffer));

      const candidates = byTeam[teamCode] || [];

      // Simple bucket picking based on order recency.
      const reminderCandidates = candidates.filter((c) => c.orderCount >= 2);
      const offerCandidates = candidates.filter((c) => c.orderCount >= 3);
      const winbackCandidates = candidates
        .filter((c) => c.orderCount >= 1 && c.lastOrderDate && c.lastOrderDate < inactiveCutoff)
        .sort((a, b) => (a.lastOrderDate || '').localeCompare(b.lastOrderDate || ''));
      const followupCandidates = candidates;

      const pickAndCreate = async (list: Candidate[], limit: number, reason: string, priority: TaskPriority) => {
        let picked = 0;
        while (picked < limit && list.length > 0) {
          const c = list.shift()!;
          // Idempotency: skip if a task already exists today for same customer+reason
          const exists = await this.callTaskRepo.query(
            `
            SELECT 1
            FROM crm_call_tasks
            WHERE task_date = $1 AND customer_id = $2 AND call_reason = $3
            LIMIT 1
            `,
            [date, c.phone, reason],
          );
          if (Array.isArray(exists) && exists.length > 0) continue;

          const notes = `Segment: ${c.purchaseStage}+${c.valueStage}. Orders: ${c.orderCount}. Last order: ${c.lastOrderDate ?? 'N/A'}.`;

          const task = this.callTaskRepo.create({
            customer_id: c.phone,
            assigned_agent_id: agentId,
            task_date: date as any,
            priority,
            call_reason: reason,
            status: TaskStatus.PENDING,
            notes,
          });
          const saved = await this.callTaskRepo.save(task);
          createdTasks.push(saved);
          picked += 1;
        }
      };

      await pickAndCreate(reminderCandidates, capReminder, 'Product Reminder', TaskPriority.WARM);
      await pickAndCreate(offerCandidates, capOffer, 'Offer / Cross-sell', TaskPriority.COLD);
      // Win-back is a special follow-up case: prioritize inactive customers within follow-up quota.
      const winbackCap = Math.min(capFollow, 15);
      await pickAndCreate(winbackCandidates, winbackCap, 'Win-back', TaskPriority.HOT);
      await pickAndCreate(followupCandidates, Math.max(0, capFollow - winbackCap), 'Follow-up / Support', TaskPriority.HOT);
    };

    // Round-robin across agents in each team code
    for (const code of ['A', 'B', 'C', 'D', 'E'] as const) {
      const agentIds = agentsByCode[code] || [];
      for (const agentId of agentIds) {
        // eslint-disable-next-line no-await-in-loop
        await createTasksForAgent(agentId, code);
      }
    }

    return {
      date,
      perAgentLimit,
      quotas: { reminderQuota, offerQuota, followupQuota },
      createdCount: createdTasks.length,
      createdTasks,
    };
  }

  // ==================== TEAM MANAGEMENT ====================

  private readonly DEFAULT_TEAM_CODES = ['A', 'B', 'C', 'D', 'E'] as const;

  private async ensureDefaultTeamsForLeader(teamLeaderId: number): Promise<void> {
    if (!Number.isFinite(teamLeaderId)) return;

    const existing = await this.salesTeamRepository.find({ where: { teamLeaderId } });
    const byCode = new Map<string, SalesTeam>();
    for (const t of existing) {
      const code = String(t.code || '').trim().toUpperCase();
      if (code) byCode.set(code, t);
    }

    const toCreate: Array<{ name: string; code: string }> = [];
    for (const code of this.DEFAULT_TEAM_CODES) {
      if (!byCode.has(code)) {
        toCreate.push({ code, name: `Team ${code}` });
      }
    }

    if (!toCreate.length) return;
    await this.salesTeamRepository.save(
      toCreate.map((t) =>
        this.salesTeamRepository.create({
          name: t.name,
          code: t.code,
          teamLeaderId,
        }),
      ),
    );
  }

  async getTeamsForLeader(teamLeaderId: number): Promise<any[]> {
    await this.ensureDefaultTeamsForLeader(teamLeaderId);
    const teams = await this.salesTeamRepository.find({ where: { teamLeaderId } });

    const order = new Map<string, number>(this.DEFAULT_TEAM_CODES.map((c, idx) => [c, idx]));
    teams.sort((a, b) => {
      const ac = String(a.code || '').toUpperCase();
      const bc = String(b.code || '').toUpperCase();
      const ai = order.has(ac) ? (order.get(ac) as number) : 999;
      const bi = order.has(bc) ? (order.get(bc) as number) : 999;
      if (ai !== bi) return ai - bi;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const result: any[] = [];
    for (const team of teams) {
      const members = await this.usersRepository.find({ where: { teamId: team.id } });
      result.push({
        id: team.id,
        name: team.name,
        code: team.code,
        memberCount: members.length,
      });
    }

    return result;
  }

  async createTeam(teamLeaderId: number, data: { name: string; code?: string }): Promise<SalesTeam> {
    const trimmedCode = String(data.code || '').trim();
    const normalizedCode = trimmedCode ? trimmedCode.toUpperCase() : '';
    if (normalizedCode) {
      const existing = await this.salesTeamRepository.findOne({
        where: { teamLeaderId, code: normalizedCode },
      });
      if (existing) {
        throw new BadRequestException(`Team code \"${normalizedCode}\" already exists`);
      }
    }

    const team = this.salesTeamRepository.create({
      name: data.name,
      code: normalizedCode || null,
      teamLeaderId,
    });
    return this.salesTeamRepository.save(team);
  }

  async updateTeam(
    teamLeaderId: number,
    teamId: number,
    data: { name?: string; code?: string | null },
  ): Promise<SalesTeam> {
    if (!Number.isFinite(teamId)) {
      throw new NotFoundException('Team not found');
    }

    const team = await this.salesTeamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You are not the leader of this team');
    }

    if (typeof data.name === 'string') {
      const name = data.name.trim();
      if (!name) throw new NotFoundException('Team name is required');
      team.name = name;
    }

    if (data.code !== undefined) {
      const code = data.code === null ? null : String(data.code).trim();
      team.code = code ? code.toUpperCase() : null;
    }

    return this.salesTeamRepository.save(team);
  }

  async deleteTeam(teamLeaderId: number, teamId: number): Promise<{ success: true }> {
    if (!Number.isFinite(teamId)) {
      throw new NotFoundException('Team not found');
    }

    const team = await this.salesTeamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You are not the leader of this team');
    }

    // Unassign any users from this team first (prevents FK issues and avoids leaving users pointing to a deleted team).
    await this.usersRepository.update({ teamId }, { teamId: null });

    await this.salesTeamRepository.delete({ id: teamId });
    return { success: true };
  }

  async assignAgentToTeam(teamLeaderId: number, teamId: number, agentId: number): Promise<User> {
    const team = await this.salesTeamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You are not the leader of this team');
    }

    const agent = await this.usersRepository.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    agent.teamId = team.id;
    if (!agent.teamLeaderId) {
      agent.teamLeaderId = teamLeaderId;
    }

    return this.usersRepository.save(agent);
  }

  async getLeadAging(teamLeaderId: number): Promise<any> {
    // Lead aging analysis
    return {
      '0-7days': 50,
      '8-14days': 40,
      '15-30days': 35,
      '30+days': 25
    };
  }
}
