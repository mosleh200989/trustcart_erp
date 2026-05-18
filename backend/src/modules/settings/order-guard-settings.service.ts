import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderGuardSettings } from './order-guard-settings.entity';

@Injectable()
export class OrderGuardSettingsService {
  constructor(
    @InjectRepository(OrderGuardSettings)
    private readonly repo: Repository<OrderGuardSettings>,
  ) {}

  async getSettings(): Promise<OrderGuardSettings> {
    let settings = await this.repo.findOne({ where: { id: 1 } });
    if (settings) return settings;

    settings = this.repo.create({
      id: 1,
      isActive: true,
      windowMinutes: 10,
      blockNoteHtml:
        '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>',
    });
    return this.repo.save(settings);
  }

  async updateSettings(input: Partial<OrderGuardSettings>): Promise<OrderGuardSettings> {
    const settings = await this.getSettings();
    const minutes = Number(input.windowMinutes ?? settings.windowMinutes);

    settings.isActive = input.isActive == null ? settings.isActive : Boolean(input.isActive);
    settings.windowMinutes = Number.isFinite(minutes) ? Math.max(1, Math.min(1440, Math.round(minutes))) : settings.windowMinutes;
    settings.blockNoteHtml =
      input.blockNoteHtml == null
        ? settings.blockNoteHtml
        : String(input.blockNoteHtml || '').trim() ||
          '<p><strong>We already received your order.</strong></p><p>Please wait before placing another order.</p>';

    return this.repo.save(settings);
  }
}
