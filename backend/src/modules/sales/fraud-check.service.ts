import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  FraudCheck,
  HoorinApiResponse,
  HoorinSheetResponse,
  HoorinSummaries,
} from './entities/fraud-check.entity';

export interface FraudCheckResult {
  success: boolean;
  data?: {
    summaries: HoorinSummaries;
    totalParcels: number;
    totalDelivered: number;
    totalCanceled: number;
    cancellationRate: number;
    riskLevel: 'low' | 'medium' | 'high';
    details?: any[];
  };
  error?: string;
  fraudCheckId?: number;
}

export interface TotalSummaryResult {
  success: boolean;
  data?: HoorinSheetResponse;
  error?: string;
  fraudCheckId?: number;
}

@Injectable()
export class FraudCheckService {
  private readonly logger = new Logger(FraudCheckService.name);
  private readonly hoorinBaseUrl = 'https://dash.hoorin.com/api/courier';

  constructor(
    @InjectRepository(FraudCheck)
    private readonly fraudCheckRepository: Repository<FraudCheck>,
    private readonly configService: ConfigService,
  ) {}

  private getApiKey(): string {
    const apiKey = this.configService.get<string>('HOORIN_API_KEY');
    if (!apiKey) {
      throw new Error('HOORIN_API_KEY is not configured');
    }
    return apiKey;
  }

  /**
   * Check courier summaries for a phone number using Hoorin API
   */
  async checkCourierSummaries(
    phoneNumber: string,
    orderId?: number,
    userId?: number,
  ): Promise<FraudCheckResult> {
    const apiKey = this.getApiKey();
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);

    // Create a pending fraud check record
    const fraudCheck = this.fraudCheckRepository.create({
      orderId,
      phoneNumber: cleanPhone,
      provider: 'hoorin',
      checkType: 'courier_summary',
      status: 'pending',
      checkedBy: userId,
    });
    await this.fraudCheckRepository.save(fraudCheck);

    try {
      const url = `${this.hoorinBaseUrl}/api`;
      this.logger.log(`Calling Hoorin API: ${url} for phone: ${cleanPhone}`);

      const response = await axios.get<HoorinApiResponse>(url, {
        params: {
          apiKey,
          searchTerm: cleanPhone,
        },
        timeout: 30000, // 30 seconds timeout
      });

      const data = response.data;
      this.logger.log(`Hoorin API response received for ${cleanPhone}`);

      // Calculate totals across all couriers
      const { totalParcels, totalDelivered, totalCanceled } =
        this.calculateTotals(data.Summaries);

      const cancellationRate =
        totalParcels > 0
          ? Math.round((totalCanceled / totalParcels) * 100 * 100) / 100
          : 0;

      const riskLevel = this.calculateRiskLevel(cancellationRate, totalParcels);

      // Update fraud check record
      fraudCheck.response = data;
      fraudCheck.status = 'success';
      fraudCheck.totalParcels = totalParcels;
      fraudCheck.totalDelivered = totalDelivered;
      fraudCheck.totalCanceled = totalCanceled;
      fraudCheck.cancellationRate = cancellationRate;
      fraudCheck.riskLevel = riskLevel;
      await this.fraudCheckRepository.save(fraudCheck);

      return {
        success: true,
        data: {
          summaries: data.Summaries,
          totalParcels,
          totalDelivered,
          totalCanceled,
          cancellationRate,
          riskLevel,
          details: data.Details,
        },
        fraudCheckId: fraudCheck.id,
      };
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to check fraud status';
      this.logger.error(`Hoorin API error: ${errorMessage}`, error?.stack);

      // Update fraud check record with error
      fraudCheck.status = 'error';
      fraudCheck.errorMessage = errorMessage;
      await this.fraudCheckRepository.save(fraudCheck);

      return {
        success: false,
        error: errorMessage,
        fraudCheckId: fraudCheck.id,
      };
    }
  }

  /**
   * Get total parcel summary using Hoorin Sheet API
   */
  async checkTotalSummary(
    phoneNumber: string,
    orderId?: number,
    userId?: number,
  ): Promise<TotalSummaryResult> {
    const apiKey = this.getApiKey();
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);

    // Create a pending fraud check record
    const fraudCheck = this.fraudCheckRepository.create({
      orderId,
      phoneNumber: cleanPhone,
      provider: 'hoorin',
      checkType: 'total_summary',
      status: 'pending',
      checkedBy: userId,
    });
    await this.fraudCheckRepository.save(fraudCheck);

    try {
      const url = `${this.hoorinBaseUrl}/sheet`;
      this.logger.log(
        `Calling Hoorin Sheet API: ${url} for phone: ${cleanPhone}`,
      );

      const response = await axios.get<HoorinSheetResponse>(url, {
        params: {
          apiKey,
          searchTerm: cleanPhone,
        },
        timeout: 30000,
      });

      const data = response.data;

      // Update fraud check record
      fraudCheck.response = data;
      fraudCheck.status = 'success';
      await this.fraudCheckRepository.save(fraudCheck);

      return {
        success: true,
        data,
        fraudCheckId: fraudCheck.id,
      };
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to get total summary';
      this.logger.error(`Hoorin Sheet API error: ${errorMessage}`, error?.stack);

      fraudCheck.status = 'error';
      fraudCheck.errorMessage = errorMessage;
      await this.fraudCheckRepository.save(fraudCheck);

      return {
        success: false,
        error: errorMessage,
        fraudCheckId: fraudCheck.id,
      };
    }
  }

  /**
   * Get fraud check history for an order
   */
  async getOrderFraudHistory(orderId: number): Promise<FraudCheck[]> {
    return this.fraudCheckRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
      relations: ['checkedByUser'],
    });
  }

  /**
   * Get fraud check history for a phone number
   */
  async getPhoneFraudHistory(phoneNumber: string): Promise<FraudCheck[]> {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    return this.fraudCheckRepository.find({
      where: { phoneNumber: cleanPhone },
      order: { createdAt: 'DESC' },
      relations: ['checkedByUser'],
    });
  }

  /**
   * Get a specific fraud check by ID
   */
  async getFraudCheckById(id: number): Promise<FraudCheck | null> {
    return this.fraudCheckRepository.findOne({
      where: { id },
      relations: ['order', 'checkedByUser'],
    });
  }

  /**
   * Clean and normalize phone number
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/[^0-9]/g, '');

    // If starts with 880, remove it (Bangladesh country code)
    if (cleaned.startsWith('880')) {
      cleaned = cleaned.substring(3);
    }

    // If starts with +880, it's already handled above
    // Ensure it starts with 0 if it's 10 digits
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }

    return cleaned;
  }

  /**
   * Calculate totals from all courier summaries
   */
  private calculateTotals(summaries: HoorinSummaries): {
    totalParcels: number;
    totalDelivered: number;
    totalCanceled: number;
  } {
    let totalParcels = 0;
    let totalDelivered = 0;
    let totalCanceled = 0;

    for (const courier of Object.keys(summaries)) {
      const summary = summaries[courier];
      if (!summary) continue;

      // Handle different response formats
      if (summary['Total Parcels'] !== undefined) {
        totalParcels += summary['Total Parcels'] || 0;
        totalDelivered += summary['Delivered Parcels'] || 0;
        totalCanceled += summary['Canceled Parcels'] || 0;
      } else if (summary['Total Delivery'] !== undefined) {
        // Pathao uses different field names
        totalParcels += summary['Total Delivery'] || 0;
        totalDelivered += summary['Successful Delivery'] || 0;
        totalCanceled += summary['Canceled Delivery'] || 0;
      }
    }

    return { totalParcels, totalDelivered, totalCanceled };
  }

  /**
   * Calculate risk level based on cancellation rate and order history
   */
  private calculateRiskLevel(
    cancellationRate: number,
    totalParcels: number,
  ): 'low' | 'medium' | 'high' {
    // If no history, consider medium risk
    if (totalParcels === 0) {
      return 'medium';
    }

    // Very few orders - not enough data
    if (totalParcels < 3) {
      return cancellationRate > 30 ? 'medium' : 'low';
    }

    // High cancellation rate
    if (cancellationRate >= 50) {
      return 'high';
    }

    // Moderate cancellation rate
    if (cancellationRate >= 25) {
      return 'medium';
    }

    // Low cancellation rate
    return 'low';
  }
}
