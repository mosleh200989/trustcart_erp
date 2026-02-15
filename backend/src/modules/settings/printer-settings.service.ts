import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrinterSettings } from './printer-settings.entity';

@Injectable()
export class PrinterSettingsService {
  constructor(
    @InjectRepository(PrinterSettings)
    private printerSettingsRepository: Repository<PrinterSettings>,
  ) {}

  async findAll(): Promise<PrinterSettings[]> {
    return this.printerSettingsRepository.find({ order: { isDefault: 'DESC', printerName: 'ASC' } });
  }

  async findOne(id: number): Promise<PrinterSettings> {
    const setting = await this.printerSettingsRepository.findOne({ where: { id } });
    if (!setting) throw new NotFoundException(`Printer setting #${id} not found`);
    return setting;
  }

  async getDefault(): Promise<PrinterSettings | null> {
    return this.printerSettingsRepository.findOne({ where: { isDefault: true, isActive: true } });
  }

  async create(data: Partial<PrinterSettings>): Promise<PrinterSettings> {
    // If this is set as default, unset all others
    if (data.isDefault) {
      await this.printerSettingsRepository.update({}, { isDefault: false });
    }
    const entity = this.printerSettingsRepository.create(data);
    return this.printerSettingsRepository.save(entity);
  }

  async update(id: number, data: Partial<PrinterSettings>): Promise<PrinterSettings> {
    const existing = await this.findOne(id);
    // If this is set as default, unset all others first
    if (data.isDefault) {
      await this.printerSettingsRepository.update({}, { isDefault: false });
    }
    Object.assign(existing, data);
    return this.printerSettingsRepository.save(existing);
  }

  async setDefault(id: number): Promise<PrinterSettings> {
    await this.printerSettingsRepository.update({}, { isDefault: false });
    const setting = await this.findOne(id);
    setting.isDefault = true;
    return this.printerSettingsRepository.save(setting);
  }

  async remove(id: number): Promise<void> {
    const setting = await this.findOne(id);
    await this.printerSettingsRepository.remove(setting);
  }
}
