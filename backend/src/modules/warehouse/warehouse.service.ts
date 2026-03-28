import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { WarehouseZone } from './entities/warehouse-zone.entity';
import { WarehouseLocation } from './entities/warehouse-location.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { CreateZoneDto } from './dto/create-zone.dto';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(WarehouseZone)
    private zoneRepo: Repository<WarehouseZone>,
    @InjectRepository(WarehouseLocation)
    private locationRepo: Repository<WarehouseLocation>,
  ) {}

  // ── Warehouse CRUD ──────────────────────────────────

  async findAll(): Promise<Warehouse[]> {
    return this.warehouseRepo.find({
      order: { created_at: 'DESC' },
      relations: ['zones'],
    });
  }

  async findOne(id: number): Promise<Warehouse> {
    const wh = await this.warehouseRepo.findOne({
      where: { id },
      relations: ['zones', 'locations'],
    });
    if (!wh) throw new NotFoundException(`Warehouse #${id} not found`);
    return wh;
  }

  async create(dto: CreateWarehouseDto): Promise<Warehouse> {
    const existing = await this.warehouseRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Warehouse code "${dto.code}" already exists`);
    const entity = this.warehouseRepo.create(dto);
    return this.warehouseRepo.save(entity);
  }

  async update(id: number, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const wh = await this.findOne(id);
    if (dto.code && dto.code !== wh.code) {
      const dup = await this.warehouseRepo.findOne({ where: { code: dto.code } });
      if (dup) throw new ConflictException(`Warehouse code "${dto.code}" already exists`);
    }
    Object.assign(wh, dto);
    return this.warehouseRepo.save(wh);
  }

  async remove(id: number): Promise<{ message: string }> {
    const wh = await this.findOne(id);
    await this.warehouseRepo.remove(wh);
    return { message: `Warehouse #${id} deleted` };
  }

  // ── Zone CRUD ───────────────────────────────────────

  async findAllZones(warehouseId: number): Promise<WarehouseZone[]> {
    return this.zoneRepo.find({
      where: { warehouse_id: warehouseId },
      order: { name: 'ASC' },
    });
  }

  async findOneZone(id: number): Promise<WarehouseZone> {
    const zone = await this.zoneRepo.findOne({ where: { id }, relations: ['locations'] });
    if (!zone) throw new NotFoundException(`Zone #${id} not found`);
    return zone;
  }

  async createZone(dto: CreateZoneDto): Promise<WarehouseZone> {
    await this.findOne(dto.warehouse_id); // ensure warehouse exists
    const entity = this.zoneRepo.create(dto);
    return this.zoneRepo.save(entity);
  }

  async updateZone(id: number, dto: Partial<CreateZoneDto>): Promise<WarehouseZone> {
    const zone = await this.findOneZone(id);
    Object.assign(zone, dto);
    return this.zoneRepo.save(zone);
  }

  async removeZone(id: number): Promise<{ message: string }> {
    const zone = await this.findOneZone(id);
    await this.zoneRepo.remove(zone);
    return { message: `Zone #${id} deleted` };
  }

  // ── Location CRUD ───────────────────────────────────

  async findAllLocations(warehouseId: number): Promise<WarehouseLocation[]> {
    return this.locationRepo.find({
      where: { warehouse_id: warehouseId },
      order: { code: 'ASC' },
      relations: ['zone'],
    });
  }

  async findOneLocation(id: number): Promise<WarehouseLocation> {
    const loc = await this.locationRepo.findOne({ where: { id }, relations: ['zone'] });
    if (!loc) throw new NotFoundException(`Location #${id} not found`);
    return loc;
  }

  async createLocation(dto: CreateLocationDto): Promise<WarehouseLocation> {
    await this.findOne(dto.warehouse_id); // ensure warehouse exists
    const entity = this.locationRepo.create(dto);
    return this.locationRepo.save(entity);
  }

  async updateLocation(id: number, dto: Partial<CreateLocationDto>): Promise<WarehouseLocation> {
    const loc = await this.findOneLocation(id);
    Object.assign(loc, dto);
    return this.locationRepo.save(loc);
  }

  async removeLocation(id: number): Promise<{ message: string }> {
    const loc = await this.findOneLocation(id);
    await this.locationRepo.remove(loc);
    return { message: `Location #${id} deleted` };
  }
}
