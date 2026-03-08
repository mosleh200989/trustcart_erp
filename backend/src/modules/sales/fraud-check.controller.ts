import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FraudCheckService } from './fraud-check.service';

@Controller('sales/fraud-check')
@UseGuards(JwtAuthGuard)
export class FraudCheckController {
  constructor(private readonly fraudCheckService: FraudCheckService) {}

  /**
   * Check courier summaries for a phone number (with optional order association)
   * GET /sales/fraud-check/courier?phone=01XXXXXXXXX&orderId=123
   */
  @Get('courier')
  async checkCourierSummaries(
    @Query('phone') phone: string,
    @Query('orderId') orderId?: string,
    @Req() req?: any,
  ) {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    const userId = req?.user?.id || req?.user?.sub;
    const orderIdNum = orderId ? parseInt(orderId, 10) : undefined;

    const result = await this.fraudCheckService.checkCourierSummaries(
      phone,
      orderIdNum,
      userId,
    );

    return result;
  }

  /**
   * Get total parcel summary for a phone number
   * GET /sales/fraud-check/total?phone=01XXXXXXXXX&orderId=123
   */
  @Get('total')
  async checkTotalSummary(
    @Query('phone') phone: string,
    @Query('orderId') orderId?: string,
    @Req() req?: any,
  ) {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    const userId = req?.user?.id || req?.user?.sub;
    const orderIdNum = orderId ? parseInt(orderId, 10) : undefined;

    const result = await this.fraudCheckService.checkTotalSummary(
      phone,
      orderIdNum,
      userId,
    );

    return result;
  }

  /**
   * Get the latest saved fraud check for a phone, or auto-run one if none exists.
   * GET /sales/fraud-check/latest?phone=01XXXXXXXXX&orderId=123
   */
  @Get('latest')
  async getLatestOrRun(
    @Query('phone') phone: string,
    @Query('orderId') orderId?: string,
    @Req() req?: any,
  ) {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    // Try to find saved result first
    const saved = await this.fraudCheckService.getLatestSuccessfulCheck(phone);
    if (saved) {
      return {
        success: true,
        source: 'saved',
        data: {
          totalParcels: saved.totalParcels ?? 0,
          totalDelivered: saved.totalDelivered ?? 0,
          totalCanceled: saved.totalCanceled ?? 0,
          cancellationRate: saved.cancellationRate ?? 0,
          riskLevel: saved.riskLevel ?? 'medium',
        },
        checkedAt: saved.createdAt,
        fraudCheckId: saved.id,
      };
    }

    // No saved result — run a fresh check
    const userId = req?.user?.id || req?.user?.sub;
    const orderIdNum = orderId ? parseInt(orderId, 10) : undefined;
    const result = await this.fraudCheckService.checkCourierSummaries(phone, orderIdNum, userId);

    return { ...result, source: 'fresh' };
  }

  /**
   * Get fraud check history for an order
   * GET /sales/fraud-check/order/:orderId/history
   */
  @Get('order/:orderId/history')
  async getOrderFraudHistory(@Param('orderId', ParseIntPipe) orderId: number) {
    const history = await this.fraudCheckService.getOrderFraudHistory(orderId);
    return { data: history };
  }

  /**
   * Get fraud check history for a phone number
   * GET /sales/fraud-check/phone/:phone/history
   */
  @Get('phone/:phone/history')
  async getPhoneFraudHistory(@Param('phone') phone: string) {
    const history = await this.fraudCheckService.getPhoneFraudHistory(phone);
    return { data: history };
  }

  /**
   * Get a specific fraud check by ID
   * GET /sales/fraud-check/:id
   */
  @Get(':id')
  async getFraudCheckById(@Param('id', ParseIntPipe) id: number) {
    const fraudCheck = await this.fraudCheckService.getFraudCheckById(id);
    if (!fraudCheck) {
      throw new BadRequestException('Fraud check not found');
    }
    return { data: fraudCheck };
  }
}
