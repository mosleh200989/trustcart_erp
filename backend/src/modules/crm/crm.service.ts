import { Injectable } from '@nestjs/common';

@Injectable()
export class CrmService {
  // Deal Stages
  async getDealStages() {
    return [
      { id: 1, name: 'Lead', slug: 'lead', displayOrder: 1, color: '#3B82F6' },
      { id: 2, name: 'Qualified', slug: 'qualified', displayOrder: 2, color: '#8B5CF6' },
      { id: 3, name: 'Proposal', slug: 'proposal', displayOrder: 3, color: '#F59E0B' },
      { id: 4, name: 'Negotiation', slug: 'negotiation', displayOrder: 4, color: '#EF4444' },
      { id: 5, name: 'Won', slug: 'won', displayOrder: 5, color: '#10B981' },
      { id: 6, name: 'Lost', slug: 'lost', displayOrder: 6, color: '#6B7280' },
    ];
  }

  // Deals
  async getDeals(ownerId?: string, priority?: string) {
    const deals = [
      {
        id: 1,
        title: 'Enterprise Software Deal',
        stage: 'qualified',
        value: 50000,
        probability: 60,
        expectedCloseDate: '2025-02-15',
        ownerId: 1,
        priority: 'high',
        company: 'Tech Corp',
        contact: 'John Doe',
        createdAt: '2025-01-10',
      },
      {
        id: 2,
        title: 'Marketing Campaign',
        stage: 'proposal',
        value: 25000,
        probability: 40,
        expectedCloseDate: '2025-02-28',
        ownerId: 2,
        priority: 'medium',
        company: 'Marketing Inc',
        contact: 'Jane Smith',
        createdAt: '2025-01-15',
      },
      {
        id: 3,
        title: 'Consulting Services',
        stage: 'negotiation',
        value: 75000,
        probability: 80,
        expectedCloseDate: '2025-03-10',
        ownerId: 1,
        priority: 'high',
        company: 'Consulting LLC',
        contact: 'Bob Johnson',
        createdAt: '2025-01-20',
      },
    ];

    let filtered = deals;
    if (ownerId) {
      filtered = filtered.filter(d => d.ownerId === parseInt(ownerId));
    }
    if (priority) {
      filtered = filtered.filter(d => d.priority === priority);
    }
    return filtered;
  }

  async createDeal(dto: any) {
    return { ...dto, id: Math.floor(Math.random() * 10000), createdAt: new Date() };
  }

  async updateDeal(id: string, dto: any) {
    return { id, ...dto, updatedAt: new Date() };
  }

  async getPipelineStats() {
    return {
      totalValue: 150000,
      totalDeals: 3,
      avgDealSize: 50000,
      conversionRate: 65,
      stageDistribution: {
        lead: 0,
        qualified: 1,
        proposal: 1,
        negotiation: 1,
        won: 0,
        lost: 0,
      },
    };
  }

  // Emails
  async getEmails() {
    return [
      {
        id: 1,
        customer: { id: 1, name: 'Tech Corp' },
        subject: 'Follow-up on proposal',
        body: 'Dear Tech Corp,\n\nThank you for your interest in our enterprise software solution...',
        toAddress: 'client@techcorp.com',
        sentAt: '2025-01-25T10:00:00Z',
        opened: true,
        openCount: 3,
        firstOpenedAt: '2025-01-25T11:30:00Z',
        lastOpenedAt: '2025-01-26T09:15:00Z',
        clicked: true,
        clickedLinks: ['https://example.com/proposal', 'https://example.com/pricing'],
        replied: false,
        bounced: false,
        templateUsed: 'Follow-up Template',
      },
      {
        id: 2,
        customer: { id: 2, name: 'Marketing Inc' },
        subject: 'Product demo invitation',
        body: 'Hello Marketing Inc,\n\nWe would like to schedule a product demonstration...',
        toAddress: 'prospect@marketinginc.com',
        sentAt: '2025-01-26T14:30:00Z',
        opened: true,
        openCount: 1,
        firstOpenedAt: '2025-01-26T16:00:00Z',
        lastOpenedAt: '2025-01-26T16:00:00Z',
        clicked: false,
        replied: false,
        bounced: false,
        templateUsed: 'Demo Invitation',
      },
      {
        id: 3,
        customer: { id: 3, name: 'Consulting LLC' },
        subject: 'Thank you for your business',
        body: 'Dear Consulting LLC,\n\nWe appreciate your business and partnership...',
        toAddress: 'contact@consultingllc.com',
        sentAt: '2025-01-27T09:00:00Z',
        opened: true,
        openCount: 2,
        firstOpenedAt: '2025-01-27T10:00:00Z',
        lastOpenedAt: '2025-01-27T14:00:00Z',
        clicked: true,
        clickedLinks: ['https://example.com/testimonial'],
        replied: true,
        repliedAt: '2025-01-27T15:30:00Z',
        bounced: false,
        templateUsed: 'Thank You Template',
      },
    ];
  }

  async getEmailStats() {
    return {
      sent: 3,
      opened: 3,
      clicked: 2,
      replied: 1,
      openRate: 100,
      clickRate: 66.7,
    };
  }

  async sendEmail(dto: any) {
    return { ...dto, id: Math.floor(Math.random() * 10000), sentAt: new Date(), status: 'sent' };
  }

  // Meetings
  async getMeetings() {
    return [
      {
        id: 1,
        title: 'Client Discovery Call',
        customer: { id: 1, name: 'Tech Corp' },
        deal: { id: 1, name: 'Enterprise Software Deal' },
        organizer: { id: 1, name: 'John Smith' },
        startTime: '2025-01-28T10:00:00Z',
        endTime: '2025-01-28T11:00:00Z',
        timezone: 'UTC',
        location: 'Conference Room A',
        meetingLink: 'https://meet.example.com/abc123',
        agenda: 'Discuss project requirements and timeline',
        status: 'scheduled',
        attendees: [1, 2],
      },
      {
        id: 2,
        title: 'Product Demo',
        customer: { id: 2, name: 'Marketing Inc' },
        deal: { id: 2, name: 'Marketing Campaign' },
        organizer: { id: 2, name: 'Jane Doe' },
        startTime: '2025-01-29T14:00:00Z',
        endTime: '2025-01-29T15:30:00Z',
        timezone: 'UTC',
        meetingLink: 'https://meet.example.com/demo456',
        agenda: 'Product demonstration and Q&A session',
        status: 'scheduled',
        attendees: [2, 3],
      },
      {
        id: 3,
        title: 'Follow-up Meeting',
        customer: { id: 3, name: 'Consulting LLC' },
        organizer: { id: 1, name: 'John Smith' },
        startTime: '2025-01-30T09:00:00Z',
        endTime: '2025-01-30T09:30:00Z',
        timezone: 'UTC',
        location: 'Virtual',
        meetingLink: 'https://meet.example.com/followup789',
        status: 'completed',
        attendees: [1, 4],
      },
    ];
  }

  async createMeeting(dto: any) {
    return { ...dto, id: Math.floor(Math.random() * 10000), createdAt: new Date(), status: 'scheduled' };
  }

  // Tasks
  async getTasks() {
    return [
      {
        id: 1,
        title: 'Follow up with lead',
        description: 'Send follow-up email',
        dueDate: '2025-01-30',
        priority: 'high',
        status: 'pending',
        assignedTo: 1,
      },
      {
        id: 2,
        title: 'Prepare proposal',
        description: 'Create proposal document',
        dueDate: '2025-02-01',
        priority: 'medium',
        status: 'in-progress',
        assignedTo: 2,
      },
    ];
  }

  async getTaskStats() {
    return {
      total: 2,
      pending: 1,
      inProgress: 1,
      completed: 0,
      overdue: 0,
    };
  }

  async createTask(dto: any) {
    return { ...dto, id: Math.floor(Math.random() * 10000), createdAt: new Date(), status: 'pending' };
  }

  // Quotes
  async getQuotes() {
    return [
      {
        id: 1,
        quoteNumber: 'Q-2025-001',
        customer: { id: 1, name: 'Tech Corp' },
        deal: { id: 1, name: 'Enterprise Software Deal' },
        validUntil: '2025-02-28',
        lineItems: [
          { id: 1, description: 'Software License', quantity: 10, unitPrice: 4000, total: 40000 },
          { id: 2, description: 'Support & Maintenance', quantity: 1, unitPrice: 10000, total: 10000 },
        ],
        subtotal: 50000,
        tax: 0,
        discount: 0,
        total: 50000,
        currency: 'USD',
        status: 'sent',
        sentAt: '2025-01-21T10:00:00Z',
        viewedAt: '2025-01-22T14:30:00Z',
        notes: 'Enterprise package with 1-year support',
        createdAt: '2025-01-20',
      },
      {
        id: 2,
        quoteNumber: 'Q-2025-002',
        customer: { id: 2, name: 'Marketing Inc' },
        deal: { id: 2, name: 'Marketing Campaign' },
        validUntil: '2025-03-15',
        lineItems: [
          { id: 3, description: 'Marketing Consultation', quantity: 20, unitPrice: 1000, total: 20000 },
          { id: 4, description: 'Campaign Setup', quantity: 1, unitPrice: 5000, total: 5000 },
        ],
        subtotal: 25000,
        tax: 0,
        discount: 0,
        total: 25000,
        currency: 'USD',
        status: 'draft',
        notes: 'Initial marketing package proposal',
        createdAt: '2025-01-22',
      },
      {
        id: 3,
        quoteNumber: 'Q-2025-003',
        customer: { id: 3, name: 'Consulting LLC' },
        validUntil: '2025-03-30',
        lineItems: [
          { id: 5, description: 'Consulting Hours', quantity: 100, unitPrice: 750, total: 75000 },
        ],
        subtotal: 75000,
        tax: 0,
        discount: 0,
        total: 75000,
        currency: 'USD',
        status: 'accepted',
        sentAt: '2025-01-23T09:00:00Z',
        viewedAt: '2025-01-23T15:00:00Z',
        acceptedAt: '2025-01-24T11:00:00Z',
        notes: 'Quarterly consulting retainer',
        createdAt: '2025-01-23',
      },
    ];
  }

  async createQuote(dto: any) {
    const quoteNumber = `Q-2025-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    return { ...dto, id: Math.floor(Math.random() * 10000), quoteNumber, createdAt: new Date(), status: 'draft' };
  }

  // Analytics
  async getAnalyticsOverview() {
    return {
      totalDeals: 3,
      totalRevenue: 150000,
      conversionRate: 65,
      avgDealSize: 50000,
      monthlyGrowth: 12.5,
    };
  }

  // Generic CRUD
  async findAll() {
    return { message: 'Retrieve all CRM records' };
  }

  async findOne(id: string) {
    return { id, message: 'Retrieve CRM record by ID' };
  }

  async create(dto: any) {
    return { ...dto, id: 'new-id', createdAt: new Date() };
  }

  async update(id: string, dto: any) {
    return { id, ...dto, updatedAt: new Date() };
  }

  async remove(id: string) {
    return { id, message: 'CRM record deleted' };
  }
}
