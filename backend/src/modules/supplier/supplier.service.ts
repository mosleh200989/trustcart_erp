import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierProduct } from './entities/supplier-product.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierProduct)
    private supplierProductRepo: Repository<SupplierProduct>,
  ) {}

  // ── Supplier CRUD ───────────────────────────────────

  async findAll(status?: string): Promise<Supplier[]> {
    const where: any = {};
    if (status) where.status = status;
    return this.supplierRepo.find({ where, order: { company_name: 'ASC' } });
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!supplier) throw new NotFoundException(`Supplier #${id} not found`);
    return supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const existing = await this.supplierRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Supplier code "${dto.code}" already exists`);
    const entity = this.supplierRepo.create(dto);
    return this.supplierRepo.save(entity);
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    if (dto.code && dto.code !== supplier.code) {
      const dup = await this.supplierRepo.findOne({ where: { code: dto.code } });
      if (dup) throw new ConflictException(`Supplier code "${dto.code}" already exists`);
    }
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async remove(id: number): Promise<{ message: string }> {
    const supplier = await this.findOne(id);
    await this.supplierRepo.remove(supplier);
    return { message: `Supplier #${id} deleted` };
  }

  // ── Supplier Products ───────────────────────────────

  async findProducts(supplierId: number): Promise<SupplierProduct[]> {
    return this.supplierProductRepo.find({
      where: { supplier_id: supplierId },
      order: { created_at: 'DESC' },
    });
  }

  async addProduct(dto: CreateSupplierProductDto): Promise<SupplierProduct> {
    await this.findOne(dto.supplier_id); // ensure supplier exists
    const entity = this.supplierProductRepo.create(dto);
    return this.supplierProductRepo.save(entity);
  }

  async updateProduct(id: number, dto: Partial<CreateSupplierProductDto>): Promise<SupplierProduct> {
    const sp = await this.supplierProductRepo.findOne({ where: { id } });
    if (!sp) throw new NotFoundException(`Supplier product #${id} not found`);
    Object.assign(sp, dto);
    return this.supplierProductRepo.save(sp);
  }

  async removeProduct(id: number): Promise<{ message: string }> {
    const sp = await this.supplierProductRepo.findOne({ where: { id } });
    if (!sp) throw new NotFoundException(`Supplier product #${id} not found`);
    await this.supplierProductRepo.remove(sp);
    return { message: `Supplier product #${id} deleted` };
  }
}
