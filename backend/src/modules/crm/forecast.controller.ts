import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('crm/forecasts')
@Public()
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get()
  getForecasts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.forecastService.getForecasts(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Post()
  async createForecast(@Body() data: any, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.forecastService.createForecast(data, userId);
    } catch (error) {
      throw new Error(`Failed to create forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put(':id/actuals')
  updateForecastActuals(
    @Param('id') forecastId: number,
    @Body('actualAmount') actualAmount: number
  ) {
    return this.forecastService.updateForecastActuals(forecastId, actualAmount);
  }

  @Post('generate/weighted-pipeline')
  async generateWeightedPipelineForecast(
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.forecastService.generateWeightedPipelineForecast(
        new Date(startDate),
        new Date(endDate),
        userId
      );
    } catch (error) {
      throw new Error(`Failed to generate forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Post('generate/historical-trend')
  async generateHistoricalTrendForecast(
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.forecastService.generateHistoricalTrendForecast(
        new Date(startDate),
        new Date(endDate),
        userId
      );
    } catch (error) {
      throw new Error(`Failed to generate forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Get('accuracy')
  getForecastAccuracy() {
    return this.forecastService.getForecastAccuracy();
  }

  @Get('quotas')
  getQuotas(
    @Query('userId') userId?: number,
    @Query('teamId') teamId?: number
  ) {
    return this.forecastService.getQuotas(userId, teamId);
  }

  @Post('quotas')
  createQuota(@Body() data: any) {
    return this.forecastService.createQuota(data);
  }

  @Put('quotas/:id/actuals')
  updateQuotaActuals(@Param('id') quotaId: number) {
    return this.forecastService.updateQuotaActuals(quotaId);
  }

  @Get('quotas/attainment')
  getQuotaAttainment(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.forecastService.getQuotaAttainment(
      new Date(startDate),
      new Date(endDate)
    );
  }
}
