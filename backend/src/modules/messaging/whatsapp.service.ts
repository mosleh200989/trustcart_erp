import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CustomersService } from '../customers/customers.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  private isEnabled(): boolean {
    return String(process.env.WHATSAPP_AUTOMATION_ENABLED || '').toLowerCase() === 'true';
  }

  private normalizeBdPhoneE164(raw: any): string | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;

    // Strip spaces and common separators
    const digits = s.replace(/[^0-9+]/g, '');

    // Already +8801XXXXXXXXX
    if (digits.startsWith('+880')) {
      const noPlus = digits.slice(1);
      return noPlus.length >= 11 ? noPlus : null;
    }

    // 8801XXXXXXXXX
    if (digits.startsWith('880')) {
      return digits.length >= 11 ? digits : null;
    }

    // 01XXXXXXXXX
    if (digits.startsWith('01') && digits.length >= 11) {
      return `880${digits.slice(1)}`;
    }

    return null;
  }

  private buildReferralShareUrl(code: string): string {
    const base = String(process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const safe = encodeURIComponent(String(code).trim());
    return `${base}/r/${safe}`;
  }

  private async sendViaMetaCloud(toE164NoPlus: string, text: string): Promise<void> {
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      throw new Error('WhatsApp Cloud API credentials missing (WHATSAPP_CLOUD_API_TOKEN / WHATSAPP_CLOUD_PHONE_NUMBER_ID)');
    }

    const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(phoneNumberId)}/messages`;

    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: toE164NoPlus,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );
  }

  private async sendText(toPhoneRaw: any, text: string): Promise<void> {
    const to = this.normalizeBdPhoneE164(toPhoneRaw);
    if (!to) return;

    const provider = String(process.env.WHATSAPP_PROVIDER || 'none').toLowerCase();

    if (provider === 'none') {
      return;
    }

    if (provider === 'meta_cloud') {
      await this.sendViaMetaCloud(to, text);
      return;
    }

    // Unknown provider: do nothing (safe default)
  }

  async sendReferralNudgeOnDeliveredOrder(input: { orderId: number; customerId: number | null }) {
    if (!this.isEnabled()) return { skipped: true, reason: 'disabled' };

    const customerId = input?.customerId != null ? Number(input.customerId) : null;
    if (!customerId) return { skipped: true, reason: 'no_customer' };

    const customer = await this.customersService.findOne(String(customerId));
    if (!customer) return { skipped: true, reason: 'customer_not_found' };

    const referralCode = await this.loyaltyService.getShareReferralCode(customerId);
    const link = this.buildReferralShareUrl(referralCode);

    const message =
      `আপনার অর্ডারটি কেমন লাগলো? এই কোডটি বন্ধুকে পাঠান: ${referralCode}\n` +
      `লিংক: ${link}\n` +
      `বন্ধু প্রথম অর্ডার সফল (ডেলিভারি) করলে আপনি বোনাস পাবেন।`;

    await this.sendText((customer as any).phone, message);

    await this.loyaltyService.recordReferralEvent({
      eventType: 'whatsapp_referral_nudge',
      referrerCustomerId: customerId,
      orderId: Number(input.orderId),
      shareCodeUsed: referralCode,
      sourceChannel: 'whatsapp',
      payload: { provider: String(process.env.WHATSAPP_PROVIDER || 'none') },
    });

    return { success: true };
  }
}
