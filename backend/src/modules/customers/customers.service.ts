import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import * as bcrypt from 'bcrypt';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  private normalizeReferralCode(raw: any): string | null {
    if (raw == null) return null;
    const code = String(raw).trim();
    if (!code) return null;
    return code;
  }

  private normalizeReferralChannel(raw: any): string | null {
    if (raw == null) return null;
    const ch = String(raw).trim().toLowerCase();
    return ch ? ch.slice(0, 30) : null;
  }

  private async resolveDefaultReferralCampaignId(): Promise<string | null> {
    try {
      const rows = await this.customersRepository.query(
        `SELECT id::text AS id FROM referral_campaigns WHERE name = $1 ORDER BY created_at ASC LIMIT 1`,
        ['Default Referral Campaign'],
      );
      return rows?.[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  private async resolvePartnerIdByCode(code: string): Promise<{ partnerId: string; partnerCode: string } | null> {
    try {
      const rows = await this.customersRepository.query(
        `SELECT id::text AS id, code FROM referral_partners WHERE lower(code) = lower($1) AND is_active = true LIMIT 1`,
        [code],
      );
      const row = rows?.[0];
      if (!row?.id) return null;
      return { partnerId: String(row.id), partnerCode: String(row.code) };
    } catch {
      return null;
    }
  }

  async findByEmail(email: string) {
    if (!email) return null;
    return this.customersRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string) {
    const normalized = typeof phone === 'string' ? phone.trim() : '';
    if (!normalized) return null;
    return this.customersRepository.findOne({ where: { phone: normalized } });
  }

  async findAll() {
    return this.customersRepository.find();
  }

  async findOne(id: string) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    return this.customersRepository.findOne({ where: { id: numericId } });
  }

  async create(createCustomerDto: any) {
    try {
      if (Array.isArray(createCustomerDto)) {
        throw new Error('Invalid customer payload');
      }

      const email =
        typeof createCustomerDto.email === 'string'
          ? createCustomerDto.email.trim()
          : null;
      const phone =
        typeof createCustomerDto.phone === 'string'
          ? createCustomerDto.phone.trim()
          : '';

      const wantsPassword =
        typeof createCustomerDto.password === 'string' &&
        createCustomerDto.password.trim().length > 0;

      if (!phone) {
        throw new Error('Phone number is required');
      }

      // Normalize empty email to null to avoid unique collisions on ''
      createCustomerDto.email = email && email.length > 0 ? email : null;
      createCustomerDto.phone = phone;

      // Referral attribution fields (optional)
      const referralCode =
        this.normalizeReferralCode(createCustomerDto.ref) ||
        this.normalizeReferralCode(createCustomerDto.referredByCode) ||
        this.normalizeReferralCode(createCustomerDto.referred_by_code) ||
        this.normalizeReferralCode(createCustomerDto.referral_code) ||
        null;

      const referralChannel =
        this.normalizeReferralChannel(createCustomerDto.referralChannel) ||
        this.normalizeReferralChannel(createCustomerDto.referred_channel) ||
        this.normalizeReferralChannel(createCustomerDto.channel) ||
        null;

      // Check if phone already exists (mandatory + login identifier)
      // If it exists and has NO password, and this request provides a password,
      // treat it as a guest->account upgrade instead of failing.
      const existingByPhone = await this.customersRepository
        .createQueryBuilder('customer')
        .addSelect('customer.password')
        .where('customer.phone = :phone', { phone })
        .getOne();

      if (existingByPhone) {
        const existingHasPassword =
          typeof (existingByPhone as any).password === 'string' &&
          (existingByPhone as any).password.length > 0;

        if (wantsPassword && !existingHasPassword) {
          // Check email uniqueness (ignore self)
          if (createCustomerDto.email) {
            const existingEmail = await this.customersRepository.findOne({
              where: { email: createCustomerDto.email },
            });
            if (existingEmail && existingEmail.id !== existingByPhone.id) {
              throw new Error('Email already exists');
            }
          }

          const patch: any = {
            isGuest: false,
            password: await bcrypt.hash(createCustomerDto.password, 10),
          };

          // Preserve referral attribution; only set if empty and caller provided a code
          if (referralCode && !(existingByPhone as any).referredByCode) {
            const defaultCampaignId = await this.resolveDefaultReferralCampaignId();
            const partner = await this.resolvePartnerIdByCode(referralCode);

            if (partner) {
              patch.referredByPartnerId = partner.partnerId;
              patch.referredByCode = partner.partnerCode;
              patch.referredChannel = referralChannel;
              patch.referredAt = new Date();
              patch.referralCampaignId = defaultCampaignId;
            } else {
              const referrerCustomerId = this.loyaltyService.tryParseShareReferralCode(referralCode);
              if (referrerCustomerId) {
                patch.referredByCustomerId = referrerCustomerId;
                patch.referredByCode = referralCode;
                patch.referredChannel = referralChannel;
                patch.referredAt = new Date();
                patch.referralCampaignId = defaultCampaignId;
              }
            }
          }

          if (Object.prototype.hasOwnProperty.call(createCustomerDto, 'email')) {
            patch.email = createCustomerDto.email;
          }
          if (createCustomerDto.name && (!existingByPhone.name || !existingByPhone.name.trim())) {
            patch.name = createCustomerDto.name;
          }
          if (
            createCustomerDto.lastName &&
            (!existingByPhone.lastName || !existingByPhone.lastName.trim())
          ) {
            patch.lastName = createCustomerDto.lastName;
          }
          if (createCustomerDto.customerType) patch.customerType = createCustomerDto.customerType;
          if (createCustomerDto.status) patch.status = createCustomerDto.status;
          patch.isActive = true;

          await this.customersRepository.update(existingByPhone.id, patch);
          const updated = await this.findOne(String(existingByPhone.id));

          // If it's a share-code referral and we now have a referred customer id, ensure referral record exists
          try {
            const referrerCustomerId =
              referralCode ? this.loyaltyService.tryParseShareReferralCode(referralCode) : null;
            if (updated?.id && referrerCustomerId) {
              await this.loyaltyService.registerReferralFromShareCode({
                referrerCustomerId,
                referredCustomerId: updated.id,
                referredEmail: updated.email ?? undefined,
                referredPhone: updated.phone ?? undefined,
                shareCodeUsed: referralCode ?? undefined,
                sourceChannel: referralChannel ?? undefined,
                campaignId: (updated as any).referralCampaignId ?? undefined,
              });
            }
          } catch {
            // never block registration upgrade
          }

          return updated;
        }

        throw new Error('Phone number already exists');
      }

      // Check if email already exists (only when provided)
      if (createCustomerDto.email) {
        const existingEmail = await this.customersRepository.findOne({
          where: { email: createCustomerDto.email },
        });
        if (existingEmail) {
          throw new Error('Email already exists');
        }
      }

      // Hash password if provided
      if (wantsPassword) {
        createCustomerDto.password = await bcrypt.hash(createCustomerDto.password, 10);
        createCustomerDto.isGuest = false;
      } else {
        createCustomerDto.isGuest = true;
      }

      // Map referral attribution onto the customer record (if provided)
      if (referralCode) {
        const defaultCampaignId = await this.resolveDefaultReferralCampaignId();
        const partner = await this.resolvePartnerIdByCode(referralCode);
        if (partner) {
          createCustomerDto.referredByPartnerId = partner.partnerId;
          createCustomerDto.referredByCode = partner.partnerCode;
          createCustomerDto.referredChannel = referralChannel;
          createCustomerDto.referredAt = new Date();
          createCustomerDto.referralCampaignId = defaultCampaignId;
        } else {
          const referrerCustomerId = this.loyaltyService.tryParseShareReferralCode(referralCode);
          if (referrerCustomerId) {
            createCustomerDto.referredByCustomerId = referrerCustomerId;
            createCustomerDto.referredByCode = referralCode;
            createCustomerDto.referredChannel = referralChannel;
            createCustomerDto.referredAt = new Date();
            createCustomerDto.referralCampaignId = defaultCampaignId;
          }
        }
      }
      
      const customer = this.customersRepository.create(createCustomerDto as any) as unknown as Customer;

      const saved = (await this.customersRepository.save(customer as any)) as Customer;

      // If this signup used a share-code referral, ensure a referral row exists immediately (status=registered)
      try {
        const referrerCustomerId =
          referralCode ? this.loyaltyService.tryParseShareReferralCode(referralCode) : null;
        if (referrerCustomerId) {
          await this.loyaltyService.registerReferralFromShareCode({
            referrerCustomerId,
            referredCustomerId: saved.id,
            referredEmail: saved.email ?? undefined,
            referredPhone: saved.phone ?? undefined,
            shareCodeUsed: referralCode ?? undefined,
            sourceChannel: referralChannel ?? undefined,
            campaignId: (saved as any).referralCampaignId ?? undefined,
          });
        } else if (referralCode) {
          // Partner code attribution event
          await this.loyaltyService.recordReferralEvent({
            eventType: 'partner_attributed',
            referredCustomerId: saved.id,
            partnerCode: referralCode,
            sourceChannel: referralChannel ?? undefined,
          });
        }
      } catch {
        // never block signup
      }

      return saved;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async update(id: string, updateCustomerDto: any) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      throw new Error('Invalid customer id');
    }

    const existingCustomer = await this.customersRepository.findOne({ where: { id: numericId } });
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    const patch: any = { ...updateCustomerDto };

    if (Object.prototype.hasOwnProperty.call(patch, 'phone')) {
      const phone = typeof patch.phone === 'string' ? patch.phone.trim() : '';
      if (!phone) {
        throw new Error('Phone number is required');
      }

      // Only enforce uniqueness if the phone is being changed.
      // This avoids false positives when legacy data contains duplicates.
      if (existingCustomer.phone !== phone) {
        const existingPhone = await this.customersRepository.findOne({ where: { phone } });
        if (existingPhone && existingPhone.id !== numericId) {
          throw new Error('Phone number already exists');
        }
      }

      patch.phone = phone;
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'email')) {
      const email = typeof patch.email === 'string' ? patch.email.trim() : null;
      patch.email = email && email.length > 0 ? email : null;

      if (patch.email) {
        if (existingCustomer.email !== patch.email) {
          const existingEmail = await this.customersRepository.findOne({ where: { email: patch.email } });
          if (existingEmail && existingEmail.id !== numericId) {
            throw new Error('Email already exists');
          }
        }
      }
    }

    if (patch.password) {
      patch.password = await bcrypt.hash(patch.password, 10);
      patch.isGuest = false;
    }

    await this.customersRepository.update(numericId, patch);
    return this.findOne(String(numericId));
  }

  async remove(id: string) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      throw new Error('Invalid customer id');
    }
    return this.customersRepository.delete(numericId);
  }
}
