import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SalesForecast } from './entities/sales-forecast.entity';
import { SalesQuota } from './entities/sales-quota.entity';
import { Deal } from './entities/deal.entity';

@Injectable()
export class ForecastService {
  constructor(
    @InjectRepository(SalesForecast)
    private forecastRepository: Repository<SalesForecast>,
    @InjectRepository(SalesQuota)
    private quotaRepository: Repository<SalesQuota>,
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
  ) {}

  // Forecast Management
  async createForecast(data: Partial<SalesForecast>, createdBy?: number) {
    const forecast = this.forecastRepository.create({
      ...data,
      createdBy: createdBy,
    });
    return this.forecastRepository.save(forecast);
  }

  async getForecasts(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate && endDate) {
      where.startDate = Between(startDate, endDate);
    }
    return this.forecastRepository.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async updateForecastActuals(forecastId: number, actualAmount: number) {
    const forecast = await this.forecastRepository.findOne({ 
      where: { id: forecastId } 
    });
    if (!forecast) throw new NotFoundException('Forecast not found');

    const accuracy = (actualAmount / forecast.forecastAmount) * 100;
    
    await this.forecastRepository.update(forecastId, {
      actualAmount,
      accuracyPercentage: Math.min(accuracy, 100)
    });

    return this.forecastRepository.findOne({ where: { id: forecastId } });
  }

  // Generate forecasts
  async generateWeightedPipelineForecast(startDate: Date, endDate: Date, createdBy?: number) {
    // Get all open deals with expected close date in range
    const deals = await this.dealRepository.find({
      where: {
        status: 'open',
        expectedCloseDate: Between(startDate, endDate)
      }
    });

    // Calculate weighted amount
    const forecastAmount = deals.reduce((sum, deal) => {
      const weighted = Number(deal.value) * (Number(deal.probability) / 100);
      return sum + weighted;
    }, 0);

    return this.createForecast({
      forecastPeriod: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      startDate,
      endDate,
      forecastType: 'weighted_pipeline',
      forecastAmount,
      dealCount: deals.length,
      metadata: {
        totalPipelineValue: deals.reduce((sum, d) => sum + Number(d.value), 0),
        averageProbability: deals.reduce((sum, d) => sum + Number(d.probability), 0) / deals.length
      }
    }, createdBy);
  }

  async generateHistoricalTrendForecast(startDate: Date, endDate: Date, createdBy?: number) {
    // Get won deals from same period in previous years
    const previousYearStart = new Date(startDate);
    previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);
    const previousYearEnd = new Date(endDate);
    previousYearEnd.setFullYear(previousYearEnd.getFullYear() - 1);

    const historicalDeals = await this.dealRepository.find({
      where: {
        status: 'won',
        actualCloseDate: Between(previousYearStart, previousYearEnd)
      }
    });

    const historicalAmount = historicalDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
    
    // Apply growth rate (e.g., 10% growth)
    const growthRate = 1.1;
    const forecastAmount = historicalAmount * growthRate;

    return this.createForecast({
      forecastPeriod: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      startDate,
      endDate,
      forecastType: 'historical_trend',
      forecastAmount,
      dealCount: historicalDeals.length,
      metadata: {
        historicalAmount,
        growthRate,
        previousPeriod: `${previousYearStart.toISOString().split('T')[0]} to ${previousYearEnd.toISOString().split('T')[0]}`
      }
    }, createdBy);
  }

  // Quota Management
  async createQuota(data: Partial<SalesQuota>) {
    const quota = this.quotaRepository.create(data);
    return this.quotaRepository.save(quota);
  }

  async getQuotas(userId?: number, teamId?: number) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (teamId) where.teamId = teamId;
    
    return this.quotaRepository.find({
      where,
      order: { startDate: 'DESC' }
    });
  }

  async updateQuotaActuals(quotaId: number) {
    const quota = await this.quotaRepository.findOne({ 
      where: { id: quotaId },
      relations: ['user', 'team']
    });
    if (!quota) throw new NotFoundException('Quota not found');

    let dealQuery = this.dealRepository
      .createQueryBuilder('deal')
      .where('deal.status = :status', { status: 'won' })
      .andWhere('deal.actualCloseDate BETWEEN :startDate AND :endDate', {
        startDate: quota.startDate,
        endDate: quota.endDate
      });

    if (quota.userId) {
      dealQuery = dealQuery.andWhere('deal.ownerId = :userId', { userId: quota.userId });
    } else if (quota.teamId) {
      // Assuming team members are tracked somewhere
      dealQuery = dealQuery.andWhere('deal.teamId = :teamId', { teamId: quota.teamId });
    }

    const deals = await dealQuery.getMany();
    const actualAmount = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
    const attainment = (actualAmount / Number(quota.quotaAmount)) * 100;

    await this.quotaRepository.update(quotaId, {
      actualAmount,
      attainmentPercentage: Math.min(attainment, 999.99)
    });

    return this.quotaRepository.findOne({ where: { id: quotaId } });
  }

  async getQuotaAttainment(startDate: Date, endDate: Date) {
    const quotas = await this.quotaRepository.find({
      where: {
        startDate: Between(startDate, endDate)
      },
      relations: ['user', 'team']
    });

    return quotas.map(quota => ({
      quota,
      attainmentPercentage: Number(quota.attainmentPercentage),
      gap: Number(quota.quotaAmount) - Number(quota.actualAmount)
    }));
  }

  async getForecastAccuracy() {
    const forecasts = await this.forecastRepository.find({
      where: {},
      order: { createdAt: 'DESC' },
      take: 10
    });

    const withActuals = forecasts.filter(f => f.actualAmount !== null);
    
    if (withActuals.length === 0) {
      return { averageAccuracy: 0, forecastCount: 0 };
    }

    const avgAccuracy = withActuals.reduce((sum, f) => sum + Number(f.accuracyPercentage), 0) / withActuals.length;

    return {
      averageAccuracy: avgAccuracy,
      forecastCount: withActuals.length,
      recentForecasts: withActuals.slice(0, 5)
    };
  }
}
