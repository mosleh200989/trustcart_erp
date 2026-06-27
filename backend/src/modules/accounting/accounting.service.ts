import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { getDhakaDateString } from '../../common/utils/dhaka-date';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { DollarConsumptionCalculation } from './entities/dollar-consumption-calculation.entity';

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
    @InjectRepository(DollarConsumptionCalculation)
    private dollarConsumptionRepo: Repository<DollarConsumptionCalculation>,
    private dataSource: DataSource,
  ) {}

  private roundMoney(value: any, scale = 2): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const factor = Math.pow(10, scale);
    return Math.round(n * factor) / factor;
  }

  private normalizeDollarLine(item: any, fallbackRate: number) {
    const usdAmount = this.roundMoney(item?.usdAmount ?? item?.usd_amount, 4);
    const exchangeRate = this.roundMoney(item?.exchangeRate ?? item?.exchange_rate ?? fallbackRate, 4);
    const bdtAmount = this.roundMoney(item?.bdtAmount ?? item?.bdt_amount ?? usdAmount * exchangeRate);
    const bankCharge = this.roundMoney(item?.bankCharge ?? item?.bank_charge);
    const vatAmount = this.roundMoney(item?.vatAmount ?? item?.vat_amount);
    const taxAmount = this.roundMoney(item?.taxAmount ?? item?.tax_amount);
    const otherCost = this.roundMoney(item?.otherCost ?? item?.other_cost);
    const totalBdt = this.roundMoney(bdtAmount + bankCharge + vatAmount + taxAmount + otherCost);

    return {
      description: String(item?.description || '').trim(),
      usdAmount,
      exchangeRate,
      bdtAmount,
      bankCharge,
      vatAmount,
      taxAmount,
      otherCost,
      totalBdt,
    };
  }

  private prepareDollarConsumptionPayload(dto: any) {
    const title = String(dto?.title || '').trim();
    if (!title) throw new BadRequestException('Title is required');

    const calculationDate = String(dto?.calculationDate ?? dto?.calculation_date ?? getDhakaDateString()).slice(0, 10);
    const fallbackRate = this.roundMoney(dto?.exchangeRate ?? dto?.exchange_rate, 4);
    const inputLines = Array.isArray(dto?.lineItems ?? dto?.line_items) ? (dto?.lineItems ?? dto?.line_items) : [];
    const lineItems = inputLines.length > 0
      ? inputLines.map((item: any) => this.normalizeDollarLine(item, fallbackRate))
      : [this.normalizeDollarLine(dto, fallbackRate)];

    const usdAmount = this.roundMoney(lineItems.reduce((sum: number, item: any) => sum + item.usdAmount, 0), 4);
    const weightedBdt = this.roundMoney(lineItems.reduce((sum: number, item: any) => sum + item.bdtAmount, 0));
    const bankCharge = this.roundMoney(lineItems.reduce((sum: number, item: any) => sum + item.bankCharge, 0));
    const vatAmount = this.roundMoney(lineItems.reduce((sum: number, item: any) => sum + item.vatAmount, 0));
    const taxAmount = this.roundMoney(lineItems.reduce((sum: number, item: any) => sum + item.taxAmount, 0));
    const otherCost = this.roundMoney(lineItems.reduce((sum: number, item: any) => sum + item.otherCost, 0));
    const totalBdt = this.roundMoney(weightedBdt + bankCharge + vatAmount + taxAmount + otherCost);
    const exchangeRate = usdAmount > 0 ? this.roundMoney(weightedBdt / usdAmount, 4) : fallbackRate;
    const effectiveRate = usdAmount > 0 ? this.roundMoney(totalBdt / usdAmount, 4) : 0;

    return {
      title,
      calculationDate,
      vendorName: dto?.vendorName ?? dto?.vendor_name ? String(dto?.vendorName ?? dto?.vendor_name).trim() : null,
      referenceNo: dto?.referenceNo ?? dto?.reference_no ? String(dto?.referenceNo ?? dto?.reference_no).trim() : null,
      usdAmount,
      exchangeRate,
      bdtAmount: weightedBdt,
      bankCharge,
      vatAmount,
      taxAmount,
      otherCost,
      totalBdt,
      effectiveRate,
      lineItems,
      notes: dto?.notes ? String(dto.notes).trim() : null,
    };
  }

  async findDollarConsumptions(query?: { page?: number; limit?: number; startDate?: string; endDate?: string; search?: string }) {
    const { page = 1, limit = 30, startDate, endDate, search } = query || {};
    const take = Math.min(Math.max(Number(limit) || 30, 1), 2000);
    const qb = this.dollarConsumptionRepo.createQueryBuilder('dc');

    if (startDate) qb.andWhere('dc.calculation_date >= :startDate', { startDate });
    if (endDate) qb.andWhere('dc.calculation_date <= :endDate', { endDate });
    if (search) {
      qb.andWhere('(dc.title ILIKE :search OR dc.vendor_name ILIKE :search OR dc.reference_no ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('dc.calculation_date', 'DESC').addOrderBy('dc.id', 'DESC').skip((Math.max(Number(page) || 1, 1) - 1) * take).take(take);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: Math.max(Number(page) || 1, 1), limit: take };
  }

  async getDollarConsumptionSummary() {
    const row = await this.dollarConsumptionRepo
      .createQueryBuilder('dc')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(dc.usd_amount), 0)', 'usdAmount')
      .addSelect('COALESCE(SUM(dc.total_bdt), 0)', 'totalBdt')
      .addSelect('COALESCE(SUM(dc.bank_charge + dc.vat_amount + dc.tax_amount + dc.other_cost), 0)', 'extraCost')
      .getRawOne();

    const usdAmount = this.roundMoney(row?.usdAmount, 4);
    const totalBdt = this.roundMoney(row?.totalBdt);
    return {
      count: Number(row?.count || 0),
      usdAmount,
      totalBdt,
      extraCost: this.roundMoney(row?.extraCost),
      averageEffectiveRate: usdAmount > 0 ? this.roundMoney(totalBdt / usdAmount, 4) : 0,
    };
  }

  async findDollarConsumption(id: number) {
    const record = await this.dollarConsumptionRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Dollar consumption calculation #${id} not found`);
    return record;
  }

  async createDollarConsumption(dto: any, userId?: number) {
    const payload = this.prepareDollarConsumptionPayload(dto);
    const record = this.dollarConsumptionRepo.create({ ...payload, createdBy: userId || null, updatedBy: userId || null } as any);
    return this.dollarConsumptionRepo.save(record as any);
  }

  async updateDollarConsumption(id: number, dto: any, userId?: number) {
    const existing = await this.findDollarConsumption(id);
    const payload = this.prepareDollarConsumptionPayload({ ...existing, ...dto });
    await this.dollarConsumptionRepo.update(id, { ...payload, updatedBy: userId || null } as any);
    return this.findDollarConsumption(id);
  }

  async deleteDollarConsumption(id: number) {
    const existing = await this.findDollarConsumption(id);
    await this.dollarConsumptionRepo.remove(existing);
    return { success: true };
  }

  async createJournal(params: CreateJournalParams): Promise<JournalEntry> {
    const number = await this.generateJournalNumber();
    const debit_total = params.lines.reduce((s, l) => s + (l.debit_amount || 0), 0);
    const credit_total = params.lines.reduce((s, l) => s + (l.credit_amount || 0), 0);

    const journal = this.journalRepo.create({
      journal_number: number,
      entry_date: getDhakaDateString(),
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

