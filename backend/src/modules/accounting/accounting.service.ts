import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';

interface CreateJournalParams {
  entry_type: string;
  description: string;
  reference_type?: string;
  reference_id?: number;
  posted_by?: number;
  metadata?: any;
  lines: {
    account_code: string;
    account_name: string;
    description?: string;
    debit_amount?: number;
    credit_amount?: number;
    product_id?: number;
    warehouse_id?: number;
  }[];
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger('AccountingService');

  constructor(
    @InjectRepository(JournalEntry)
    private journalRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private lineRepo: Repository<JournalLine>,
    private dataSource: DataSource,
  ) {}

  async createJournal(params: CreateJournalParams): Promise<JournalEntry> {
    const number = await this.generateJournalNumber();
    const debit_total = params.lines.reduce((s, l) => s + (l.debit_amount || 0), 0);
    const credit_total = params.lines.reduce((s, l) => s + (l.credit_amount || 0), 0);

    const journal = this.journalRepo.create({
      journal_number: number,
      entry_date: new Date().toISOString().slice(0, 10),
      entry_type: params.entry_type,
      description: params.description,
      debit_total,
      credit_total,
      status: 'posted',
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      posted_by: params.posted_by,
      posted_at: new Date(),
      metadata: params.metadata,
    } as any);

    const saved = await this.journalRepo.save(journal as any) as unknown as JournalEntry;

    for (const line of params.lines) {
      const jl = this.lineRepo.create({
        journal_entry_id: saved.id,
        ...line,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
      } as any);
      await this.lineRepo.save(jl as any);
    }

    return this.findOne(saved.id);
  }

  /** Called when GRN is accepted — Debit Inventory Asset, Credit AP */
  async recordStockReceipt(grnId: number, items: { product_id: number; warehouse_id: number; quantity: number; unit_cost: number }[], userId?: number): Promise<JournalEntry> {
    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const lines: CreateJournalParams['lines'] = [
      { account_code: 'INVENTORY_ASSET', account_name: 'Inventory Asset', description: 'Goods received', debit_amount: totalAmount, product_id: items[0]?.product_id, warehouse_id: items[0]?.warehouse_id },
      { account_code: 'ACCOUNTS_PAYABLE', account_name: 'Accounts Payable', description: 'Supplier payable', credit_amount: totalAmount },
    ];
    return this.createJournal({ entry_type: 'stock_receipt', description: `Stock receipt from GRN #${grnId}`, reference_type: 'grn', reference_id: grnId, posted_by: userId, lines });
  }

  /** Called when sales order dispatched — Debit COGS, Credit Inventory Asset */
  async recordSalesDispatch(orderId: number, items: { product_id: number; warehouse_id: number; quantity: number; unit_cost: number }[], userId?: number): Promise<JournalEntry> {
    const totalCogs = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const lines: CreateJournalParams['lines'] = [
      { account_code: 'COGS', account_name: 'Cost of Goods Sold', description: 'Sales dispatch COGS', debit_amount: totalCogs },
      { account_code: 'INVENTORY_ASSET', account_name: 'Inventory Asset', description: 'Inventory deduction', credit_amount: totalCogs, product_id: items[0]?.product_id, warehouse_id: items[0]?.warehouse_id },
    ];
    return this.createJournal({ entry_type: 'sales_dispatch', description: `COGS for order #${orderId}`, reference_type: 'sales_order', reference_id: orderId, posted_by: userId, lines });
  }

  /** Called on stock adjustment approval */
  async recordStockAdjustment(adjustmentId: number, adjustmentType: string, totalValue: number, userId?: number): Promise<JournalEntry> {
    const isIncrease = adjustmentType === 'increase';
    const lines: CreateJournalParams['lines'] = isIncrease
      ? [
          { account_code: 'INVENTORY_ASSET', account_name: 'Inventory Asset', debit_amount: totalValue },
          { account_code: 'INVENTORY_ADJUSTMENT', account_name: 'Inventory Adjustment Account', credit_amount: totalValue },
        ]
      : [
          { account_code: 'INVENTORY_SHRINKAGE', account_name: 'Inventory Shrinkage Expense', debit_amount: totalValue },
          { account_code: 'INVENTORY_ASSET', account_name: 'Inventory Asset', credit_amount: totalValue },
        ];
    return this.createJournal({ entry_type: 'stock_adjustment', description: `Stock adjustment #${adjustmentId} (${adjustmentType})`, reference_type: 'stock_adjustment', reference_id: adjustmentId, posted_by: userId, lines });
  }

  async findAll(query?: { page?: number; limit?: number; entry_type?: string; reference_type?: string; startDate?: string; endDate?: string }): Promise<{ data: JournalEntry[]; total: number }> {
    const { page = 1, limit = 30, entry_type, reference_type, startDate, endDate } = query || {};
    const qb = this.journalRepo.createQueryBuilder('je').leftJoinAndSelect('je.lines', 'lines');
    if (entry_type) qb.andWhere('je.entry_type = :entry_type', { entry_type });
    if (reference_type) qb.andWhere('je.reference_type = :reference_type', { reference_type });
    if (startDate) qb.andWhere('je.entry_date >= :startDate', { startDate });
    if (endDate) qb.andWhere('je.entry_date <= :endDate', { endDate });
    qb.orderBy('je.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: number): Promise<JournalEntry> {
    const je = await this.journalRepo.findOne({ where: { id }, relations: ['lines'] });
    if (!je) throw new NotFoundException(`Journal entry #${id} not found`);
    return je;
  }

  async getSummary(): Promise<any> {
    const result = await this.journalRepo.createQueryBuilder('je')
      .select('je.entry_type', 'entry_type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(je.debit_total)', 'total_debit')
      .addSelect('SUM(je.credit_total)', 'total_credit')
      .where('je.status = :status', { status: 'posted' })
      .groupBy('je.entry_type')
      .getRawMany();
    return result;
  }

  private async generateJournalNumber(): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT journal_number FROM journal_entries ORDER BY id DESC LIMIT 1`
    );
    const last = result?.[0]?.journal_number;
    if (last) {
      const num = parseInt(last.replace('JE-', ''), 10) + 1;
      return `JE-${String(num).padStart(6, '0')}`;
    }
    return 'JE-000001';
  }
}

