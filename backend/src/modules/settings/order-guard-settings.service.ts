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

  private async ensureTable() {
    await this.repo.query(`
      CREATE TABLE IF NOT EXISTS order_guard_settings (
        id integer PRIMARY KEY DEFAULT 1,
        is_active boolean NOT NULL DEFAULT true,
        window_minutes integer NOT NULL DEFAULT 10,
        block_note_html text NOT NULL DEFAULT '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>',
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT order_guard_settings_singleton CHECK (id = 1),
        CONSTRAINT order_guard_settings_window_positive CHECK (window_minutes > 0)
      )
    `);

    await this.repo.query(`
      INSERT INTO order_guard_settings (id, is_active, window_minutes, block_note_html, created_at, updated_at)
      VALUES (
        1,
        true,
        10,
        '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  async getSettings(): Promise<OrderGuardSettings> {
    await this.ensureTable();
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
    await this.ensureTable();
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
