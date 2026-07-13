import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

type AdaReachTokenState = {
  token: string;
  refreshToken: string;
  expiresAt: number;
};

export type SmsSendResult = {
  provider: 'adareach';
  receiver: string;
  status: string;
  description?: string;
  messageId?: string | number;
  msgCost?: string | number;
  currentBalance?: string | number;
  contentType?: number;
  msgCount?: number;
  errorCode?: number;
  raw: any;
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private adaReachToken: AdaReachTokenState | null = null;

  private get provider() {
    return String(process.env.SMS_PROVIDER || '').trim().toLowerCase();
  }

  private get baseUrl() {
    return String(process.env.ADAREACH_API_BASE_URL || 'https://api.mobireach.com.bd').replace(/\/+$/, '');
  }

  normalizeBdMobile(raw: any): string | null {
    if (raw == null) return null;
    const cleaned = String(raw).trim().replace(/[^\d+]/g, '');
    if (!cleaned) return null;

    let digits = cleaned;
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (digits.startsWith('880')) {
      return /^8801\d{9}$/.test(digits) ? digits : null;
    }
    if (digits.startsWith('01')) {
      const normalized = `880${digits.slice(1)}`;
      return /^8801\d{9}$/.test(normalized) ? normalized : null;
    }
    return null;
  }

  private getUnicodeContentType(content: string) {
    return /[^\x00-\x7F]/.test(content) ? 2 : 1;
  }

  private getAdaReachMsgType() {
    const raw = String(process.env.ADAREACH_MSG_TYPE || 'T').trim().toLowerCase();
    if (['p', 'promo', 'promotional'].includes(raw)) return 'P';
    return 'T';
  }

  private formatAdaReachError(error: any, fallback: string) {
    const data = error?.response?.data;
    const message = data?.message || data?.description || error?.message || fallback;
    const errorCode = data?.errorCode != null ? ` (errorCode: ${data.errorCode})` : '';
    return `${message}${errorCode}`;
  }

  private assertAdaReachConfigured() {
    if (this.provider !== 'adareach') {
      throw new BadRequestException('SMS provider is not configured for adaReach. Set SMS_PROVIDER=adareach.');
    }
    const username = process.env.ADAREACH_USERNAME;
    const password = process.env.ADAREACH_PASSWORD;
    const sender = process.env.ADAREACH_SENDER;
    if (!username || !password || !sender) {
      throw new BadRequestException('adaReach SMS credentials are missing. Set ADAREACH_USERNAME, ADAREACH_PASSWORD, and ADAREACH_SENDER.');
    }
  }

  private async loginAdaReach(): Promise<AdaReachTokenState> {
    let response;
    try {
      response = await axios.post(
        `${this.baseUrl}/auth/tokens`,
        {
          username: String(process.env.ADAREACH_USERNAME || '').trim(),
          password: String(process.env.ADAREACH_PASSWORD || '').trim(),
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        },
      );
    } catch (error: any) {
      throw new BadRequestException(`adaReach authentication failed: ${this.formatAdaReachError(error, 'Unable to generate SMS token')}`);
    }

    const token = String(response.data?.token || '').trim();
    const refreshToken = String(response.data?.refresh_token || '').trim();
    if (!token || !refreshToken) {
      throw new BadRequestException('adaReach token response did not include token and refresh_token.');
    }

    this.adaReachToken = {
      token,
      refreshToken,
      expiresAt: Date.now() + 55 * 60 * 1000,
    };
    return this.adaReachToken;
  }

  private async refreshAdaReachToken(): Promise<AdaReachTokenState | null> {
    if (!this.adaReachToken?.refreshToken) return null;
    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/token/refresh`,
        null,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.adaReachToken.refreshToken}`,
          },
          timeout: 15000,
        },
      );

      const token = String(response.data?.token || '').trim();
      const refreshToken = String(response.data?.refresh_token || '').trim();
      if (!token || !refreshToken) return null;

      this.adaReachToken = {
        token,
        refreshToken,
        expiresAt: Date.now() + 55 * 60 * 1000,
      };
      return this.adaReachToken;
    } catch (error: any) {
      this.logger.warn(`adaReach token refresh failed; falling back to login: ${error?.message || error}`);
      this.adaReachToken = null;
      return null;
    }
  }

  private async getAdaReachAccessToken(): Promise<string> {
    this.assertAdaReachConfigured();
    if (this.adaReachToken && this.adaReachToken.expiresAt > Date.now() + 60 * 1000) {
      return this.adaReachToken.token;
    }

    const refreshed = await this.refreshAdaReachToken();
    if (refreshed) return refreshed.token;

    const loggedIn = await this.loginAdaReach();
    return loggedIn.token;
  }

  private async postAdaReachSms(receiver: string, content: string): Promise<SmsSendResult> {
    const token = await this.getAdaReachAccessToken();
    const contentType = this.getUnicodeContentType(content);
    const response = await axios.post(
      `${this.baseUrl}/sms/send`,
      {
        sender: process.env.ADAREACH_SENDER,
        receiver: [receiver],
        content,
        msgType: this.getAdaReachMsgType(),
        requestType: 'S',
        contentType,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 20000,
      },
    );

    const data = response.data || {};
    return {
      provider: 'adareach',
      receiver,
      status: String(data.status || '').toUpperCase(),
      description: data.description,
      messageId: data.messageId,
      msgCost: data.msgCost,
      currentBalance: data.currentBalance,
      contentType: data.contentType ?? contentType,
      msgCount: data.msgCount,
      errorCode: data.errorCode,
      raw: data,
    };
  }

  async sendTransactionalSms(input: { receiver: string; content: string }): Promise<SmsSendResult> {
    const receiver = this.normalizeBdMobile(input.receiver);
    if (!receiver) {
      throw new BadRequestException('Customer phone number is not a valid Bangladeshi mobile number.');
    }
    const content = String(input.content || '').trim();
    if (!content) {
      throw new BadRequestException('SMS message cannot be empty.');
    }

    try {
      const result = await this.postAdaReachSms(receiver, content);
      if (result.status !== 'SUCCESS') {
        throw new BadRequestException(result.description || `adaReach SMS failed with error code ${result.errorCode ?? 'unknown'}`);
      }
      return result;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorCode = Number(error?.response?.data?.errorCode);
      if (status === 401 || errorCode === 1501) {
        this.adaReachToken = null;
        const retry = await this.postAdaReachSms(receiver, content);
        if (retry.status !== 'SUCCESS') {
          throw new BadRequestException(retry.description || `adaReach SMS failed with error code ${retry.errorCode ?? 'unknown'}`);
        }
        return retry;
      }
      throw new BadRequestException(`adaReach SMS failed: ${this.formatAdaReachError(error, 'Unable to send SMS')}`);
    }
  }
}
