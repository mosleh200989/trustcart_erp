import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { EmailTracking } from './entities/email-tracking.entity';
import { EngagementHistory, EngagementStatus, EngagementType } from './entities/engagement-history.entity';
import { EmailTemplateService } from './email-template.service';

export type SendEmailRequest = {
  customerId: number;
  toAddress?: string;
  subject?: string;
  body?: string;
  ccAddresses?: string[];
  bccAddresses?: string[];
  templateId?: number;
  templateUsed?: string;
  variables?: Record<string, any>;
  sentBy: number;
};

export type SendSmsRequest = {
  customerId: number;
  toNumber?: string;
  message: string;
  sentBy: number;
  campaignId?: number;
};

function textToSimpleHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">${escaped}</div>`;
}

function injectOpenPixel(html: string, pixelUrl: string): string {
  const pixel = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;width:1px;height:1px;" />`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pixel}</body>`);
  }
  return `${html}${pixel}`;
}

function injectClickTracking(html: string, clickBaseUrl: string): string {
  // Naive link rewriting; keeps mail-safe simple HTML.
  return html.replace(/href=\"(https?:\/\/[^\"]+)\"/gi, (match, url) => {
    const wrapped = `${clickBaseUrl}?url=${encodeURIComponent(url)}`;
    return `href="${wrapped}"`;
  });
}

@Injectable()
export class CommunicationsService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(EmailTracking)
    private readonly emailTrackingRepository: Repository<EmailTracking>,
    @InjectRepository(EngagementHistory)
    private readonly engagementRepository: Repository<EngagementHistory>,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  private getOrCreateTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

    if (!host) {
      throw new Error('SMTP_HOST is not configured');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }

  async sendEmail(request: SendEmailRequest): Promise<EmailTracking> {
    const customer = await this.customersRepository.findOne({ where: { id: request.customerId } });

    const toAddress = request.toAddress || customer?.email || '';
    if (!toAddress) {
      throw new Error('Recipient email address missing (toAddress)');
    }

    let subject = request.subject || '';
    let textBody = request.body || '';
    let htmlBody: string | null = null;
    let templateUsed = request.templateUsed;

    if (request.templateId) {
      const variables = {
        customer,
        customerName: customer?.name,
        name: customer?.name,
        email: customer?.email,
        phone: customer?.phone,
        ...request.variables,
      };
      const rendered = await this.emailTemplateService.renderTemplate(request.templateId, variables);
      subject = rendered.subject;
      textBody = rendered.body;
      htmlBody = rendered.htmlBody || null;
    }

    if (!subject) {
      throw new Error('Email subject is required');
    }

    if (!textBody && !htmlBody) {
      throw new Error('Email body is required');
    }

    if (!htmlBody) {
      htmlBody = textToSimpleHtml(textBody || '');
    }

    const emailRecord = this.emailTrackingRepository.create({
      customerId: request.customerId,
      sentBy: request.sentBy,
      subject,
      body: textBody || '',
      toAddress,
      ccAddresses: request.ccAddresses,
      bccAddresses: request.bccAddresses,
      sentAt: new Date(),
      templateUsed,
    });

    const saved = await this.emailTrackingRepository.save(emailRecord);

    const publicApiUrl = (process.env.PUBLIC_API_URL || process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
    if (publicApiUrl) {
      const pixelUrl = `${publicApiUrl}/crm/emails/${saved.id}/pixel`;
      const clickBaseUrl = `${publicApiUrl}/crm/emails/${saved.id}/click`;
      htmlBody = injectClickTracking(htmlBody, clickBaseUrl);
      htmlBody = injectOpenPixel(htmlBody, pixelUrl);
    }

    const from = process.env.SMTP_FROM || 'no-reply@trustcart.local';

    try {
      const transporter = this.getOrCreateTransporter();
      await transporter.sendMail({
        from,
        to: toAddress,
        cc: request.ccAddresses,
        bcc: request.bccAddresses,
        subject,
        text: textBody || undefined,
        html: htmlBody || undefined,
      });
      const sent = await this.emailTrackingRepository.findOne({
        where: { id: saved.id },
        relations: ['customer', 'sender'],
      });
      return sent ?? saved;
    } catch (error: any) {
      await this.emailTrackingRepository.update(saved.id, {
        bounced: true,
        attachments: [
          {
            type: 'send_error',
            message: error?.message || 'Unknown error',
            occurredAt: new Date().toISOString(),
          },
        ] as any,
      });

      // Return the record so the UI still has email history; mark it bounced to indicate failure.
      const failed = await this.emailTrackingRepository.findOne({
        where: { id: saved.id },
        relations: ['customer', 'sender'],
      });
      return failed ?? saved;
    }
  }

  async sendSms(request: SendSmsRequest): Promise<EngagementHistory> {
    const customer = await this.customersRepository.findOne({ where: { id: request.customerId } });

    const toNumber = request.toNumber || customer?.mobile || customer?.phone || '';
    if (!toNumber) {
      throw new Error('Recipient phone number missing (toNumber)');
    }

    const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();

    const engagement = this.engagementRepository.create({
      customer_id: String(request.customerId),
      engagement_type: EngagementType.SMS,
      channel: 'sms',
      status: EngagementStatus.SENT,
      message_content: request.message,
      agent_id: request.sentBy,
      campaign_id: request.campaignId,
      response_received: false,
      metadata: {
        to: toNumber,
        provider,
      },
    });

    const saved = await this.engagementRepository.save(engagement);

    if (provider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        await this.engagementRepository.update(saved.id, {
          status: EngagementStatus.FAILED,
          metadata: { ...(saved.metadata || {}), error: 'Twilio env vars missing' },
        });
        throw new Error('Twilio is not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER)');
      }

      try {
        const params = new URLSearchParams();
        params.append('To', toNumber);
        params.append('From', fromNumber);
        params.append('Body', request.message);

        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        const response = await axios.post(url, params, {
          auth: { username: accountSid, password: authToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        await this.engagementRepository.update(saved.id, {
          status: EngagementStatus.SENT,
          metadata: { ...(saved.metadata || {}), twilioSid: response.data?.sid, twilioStatus: response.data?.status },
        });

        const updated = await this.engagementRepository.findOne({ where: { id: saved.id } });
        return updated ?? saved;
      } catch (error: any) {
        await this.engagementRepository.update(saved.id, {
          status: EngagementStatus.FAILED,
          metadata: { ...(saved.metadata || {}), error: error?.message || 'Twilio send failed' },
        });
        throw new Error(`Failed to send SMS: ${error?.message || 'Unknown error'}`);
      }
    }

    // mock provider: no-op
    return saved;
  }
}
