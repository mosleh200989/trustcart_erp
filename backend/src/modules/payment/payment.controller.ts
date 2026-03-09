import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  ParseIntPipe,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://www.trustcart.com.bd';
  }

  /**
   * POST /api/payments/initiate
   * Initiate an SSLCommerz payment for an order. Returns the gatewayUrl to redirect the user to.
   */
  @Post('initiate')
  async initiatePayment(@Body() dto: InitiatePaymentDto) {
    const result = await this.paymentService.initiatePayment(dto);
    return {
      success: true,
      gatewayUrl: result.gatewayUrl,
      transactionId: result.transactionId,
    };
  }

  /**
   * POST /api/payments/success
   * SSLCommerz redirects the customer here after successful payment.
   * We validate and redirect to the frontend thank-you page.
   */
  @Public()
  @Post('success')
  @HttpCode(200)
  async paymentSuccess(@Body() body: Record<string, any>, @Res() res: Response) {
    this.logger.log('Payment success callback received');
    try {
      const result = await this.paymentService.handleSuccess(body);
      // Redirect to frontend with payment result
      const redirectUrl = `${this.frontendUrl}/payment/success?orderId=${result.orderId}&transactionId=${result.transactionId}&status=${result.status}`;
      return res.redirect(302, redirectUrl);
    } catch (err) {
      this.logger.error(`Payment success handler error: ${err}`);
      const redirectUrl = `${this.frontendUrl}/payment/fail?error=validation_failed`;
      return res.redirect(302, redirectUrl);
    }
  }

  /**
   * POST /api/payments/fail
   * SSLCommerz redirects here when payment fails.
   */
  @Public()
  @Post('fail')
  @HttpCode(200)
  async paymentFail(@Body() body: Record<string, any>, @Res() res: Response) {
    this.logger.log('Payment fail callback received');
    try {
      const result = await this.paymentService.handleFail(body);
      const redirectUrl = `${this.frontendUrl}/payment/fail?orderId=${result.orderId}&transactionId=${result.transactionId}`;
      return res.redirect(302, redirectUrl);
    } catch (err) {
      this.logger.error(`Payment fail handler error: ${err}`);
      const redirectUrl = `${this.frontendUrl}/payment/fail?error=unknown`;
      return res.redirect(302, redirectUrl);
    }
  }

  /**
   * POST /api/payments/cancel
   * SSLCommerz redirects here when customer cancels.
   */
  @Public()
  @Post('cancel')
  @HttpCode(200)
  async paymentCancel(@Body() body: Record<string, any>, @Res() res: Response) {
    this.logger.log('Payment cancel callback received');
    try {
      const result = await this.paymentService.handleCancel(body);
      const redirectUrl = `${this.frontendUrl}/payment/cancel?orderId=${result.orderId}&transactionId=${result.transactionId}`;
      return res.redirect(302, redirectUrl);
    } catch (err) {
      this.logger.error(`Payment cancel handler error: ${err}`);
      const redirectUrl = `${this.frontendUrl}/payment/cancel`;
      return res.redirect(302, redirectUrl);
    }
  }

  /**
   * POST /api/payments/ipn/sslcommerz
   * SSLCommerz server-to-server IPN (Instant Payment Notification).
   * This is the most reliable callback - processes payment confirmation.
   */
  @Public()
  @Post('ipn/sslcommerz')
  @HttpCode(200)
  async ipnCallback(@Body() body: Record<string, any>) {
    this.logger.log('SSLCommerz IPN received');
    return this.paymentService.handleIPN(body);
  }

  /**
   * GET /api/payments/status/:orderId
   * Get payment status for an order.
   */
  @Get('status/:orderId')
  async getPaymentStatus(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.getPaymentStatus(orderId);
  }

  /**
   * GET /api/payments/check/:transactionId
   * Verify a transaction with SSLCommerz.
   */
  @Get('check/:transactionId')
  async checkTransaction(@Param('transactionId') transactionId: string) {
    return this.paymentService.checkTransactionStatus(transactionId);
  }

  /**
   * POST /api/payments/refund
   * Initiate a refund (admin only).
   */
  @Post('refund')
  async initiateRefund(
    @Body() body: { transactionId: string; refundAmount: number; refundRemarks: string },
  ) {
    return this.paymentService.initiateRefund(
      body.transactionId,
      body.refundAmount,
      body.refundRemarks,
    );
  }
}
