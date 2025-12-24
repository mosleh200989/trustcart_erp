import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { SalesTeam } from './entities/sales-team.entity';
import { User } from '../users/user.entity';

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
  ) {}

  // ==================== LEAD ASSIGNMENT ====================
  async assignLeadToAgent(customerId: string, agentId: number, teamLeaderId: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Store assignment info in customer metadata or create separate table
    customer.assigned_to = agentId;
    customer.updatedAt = new Date();

    return await this.customerRepository.save(customer);
  }

  async reassignCustomer(customerId: string, newAgentId: number, teamLeaderId: number): Promise<Customer> {
    return await this.assignLeadToAgent(customerId, newAgentId, teamLeaderId);
  }

  async setLeadPriority(customerId: string, priority: LeadPriority): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    
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
    const skip = (page - 1) * limit;

    const where: any = {};
    if (priority) where.priority = priority;
    if (status) where.status = status;

    const [data, total] = await this.customerRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit
    });

    return { data, total };
  }

  async getAgentCustomers(agentId: number, query: any = {}): Promise<{ data: Customer[], total: number }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.customerRepository.findAndCount({
      where: { assigned_to: agentId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit
    });

    return { data, total };
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
      where: { is_escalated: true },
      order: { escalated_at: 'DESC' }
    });
  }

  // ==================== ANALYTICS ====================
  async getTeamLeaderDashboard(teamLeaderId: number): Promise<any> {
    return {
      overview: {
        totalLeads: 150,
        activeLeads: 120,
        closedDeals: 35,
        lostDeals: 15,
        revenue: 2500000
      },
      priorityBreakdown: {
        hot: 45,
        warm: 60,
        cold: 45
      },
      teamPerformance: await this.getTeamPerformance(teamLeaderId),
      recentEscalations: await this.getEscalatedCustomers(teamLeaderId)
    };
  }

  // ==================== TEAM MANAGEMENT ====================

  async getTeamsForLeader(teamLeaderId: number): Promise<any[]> {
    const teams = await this.salesTeamRepository.find({ where: { teamLeaderId } });

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
    const team = this.salesTeamRepository.create({
      name: data.name,
      code: data.code || null,
      teamLeaderId,
    });
    return this.salesTeamRepository.save(team);
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
