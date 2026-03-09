import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from './payment-transaction.entity';
import { SalesOrder } from '../sales/sales-order.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import * as https from 'https';
import * as http from 'http';
import * as querystring from 'querystring';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly isSandbox: boolean;
  private readonly baseUrl: string;
  private readonly successUrl: string;
  private readonly failUrl: string;
  private readonly cancelUrl: string;
  private readonly ipnUrl: string;

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly txnRepo: Repository<PaymentTransaction>,
    @InjectRepository(SalesOrder)
    private readonly orderRepo: Repository<SalesOrder>,
    private readonly configService: ConfigService,
  ) {
    this.storeId = this.configService.get<string>('SSLCOMMERZ_STORE_ID') || '';
    this.storePassword = this.configService.get<string>('SSLCOMMERZ_STORE_PASSWORD') || '';
    this.isSandbox = this.configService.get<string>('SSLCOMMERZ_IS_SANDBOX') === 'true';
    this.baseUrl = this.isSandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
    this.successUrl = this.configService.get<string>('SSLCOMMERZ_SUCCESS_URL') || '';
    this.failUrl = this.configService.get<string>('SSLCOMMERZ_FAIL_URL') || '';
    this.cancelUrl = this.configService.get<string>('SSLCOMMERZ_CANCEL_URL') || '';
    this.ipnUrl = this.configService.get<string>('SSLCOMMERZ_IPN_URL') || '';
  }

  /**
   * Initiate an SSLCommerz payment session for a given order.
   * Returns the GatewayPageURL to redirect the customer to.
   */
  async initiatePayment(dto: InitiatePaymentDto): Promise<{ gatewayUrl: string; transactionId: string }> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException(`Order #${dto.orderId} not found`);
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('This order is already paid');
    }

    // Generate a unique transaction ID
    const tranId = `TXN-${order.id}-${Date.now()}`;

    // Create a pending payment transaction record
    const txn = this.txnRepo.create({
      orderId: order.id,
      transactionId: tranId,
      gateway: 'sslcommerz',
      amount: Number(order.totalAmount),
      currency: 'BDT',
      status: 'pending',
    });
    await this.txnRepo.save(txn);

    // Update order payment info
    await this.orderRepo.update(order.id, {
      paymentMethod: 'sslcommerz',
      paymentStatus: 'pending',
      paymentTransactionId: tranId,
    });

    // Build SSLCommerz init payload
    const customerName = dto.customerName || order.customerName || 'Customer';
    const customerEmail = dto.customerEmail || order.customerEmail || 'customer@trustcart.com.bd';
    const customerPhone = dto.customerPhone || order.customerPhone || '01700000000';
    const shippingAddress = dto.shippingAddress || order.shippingAddress || 'Dhaka, Bangladesh';

    const postData: Record<string, string> = {
      store_id: this.storeId,
      store_passwd: this.storePassword,
      total_amount: String(order.totalAmount),
      currency: 'BDT',
      tran_id: tranId,
      success_url: this.successUrl,
      fail_url: this.failUrl,
      cancel_url: this.cancelUrl,
      ipn_url: this.ipnUrl,
      // Shipping info
      shipping_method: 'Courier',
      product_name: `Order #${order.salesOrderNumber}`,
      product_category: 'Groceries',
      product_profile: 'physical-goods',
      // Customer info
      cus_name: customerName,
      cus_email: customerEmail,
      cus_add1: shippingAddress,
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: customerPhone,
      // Ship info
      ship_name: customerName,
      ship_add1: shippingAddress,
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: '1000',
      ship_country: 'Bangladesh',
      // Value-add params
      value_a: String(order.id), // pass order ID for IPN reference
      value_b: order.salesOrderNumber,
    };

    const response = await this.sslcommerzRequest('/gwprocess/v4', postData);

    if (response.status !== 'SUCCESS') {
      // Update transaction with error
      await this.txnRepo.update(txn.id, {
        status: 'failed',
        errorMessage: response.failedreason || 'SSLCommerz session creation failed',
        gatewayResponse: response,
      });
      throw new BadRequestException(
        response.failedreason || 'Failed to create payment session with SSLCommerz',
      );
    }

    // Update transaction with session key
    await this.txnRepo.update(txn.id, {
      gatewayResponse: response,
    });

    return {
      gatewayUrl: response.GatewayPageURL,
      transactionId: tranId,
    };
  }

  /**
   * Handle SSLCommerz IPN (Instant Payment Notification).
   * Called by SSLCommerz server-to-server after payment.
   */
  async handleIPN(ipnData: Record<string, any>): Promise<{ message: string }> {
    this.logger.log(`SSLCommerz IPN received: tran_id=${ipnData.tran_id}, status=${ipnData.status}`);

    const tranId = ipnData.tran_id;
    if (!tranId) {
      this.logger.warn('IPN received without tran_id');
      return { message: 'Invalid IPN: missing tran_id' };
    }

    const txn = await this.txnRepo.findOne({ where: { transactionId: tranId } });
    if (!txn) {
      this.logger.warn(`IPN for unknown transaction: ${tranId}`);
      return { message: 'Transaction not found' };
    }

    // Prevent double processing
    if (txn.status === 'validated') {
      this.logger.log(`Transaction ${tranId} already validated, skipping`);
      return { message: 'Already processed' };
    }

    if (ipnData.status === 'VALID' || ipnData.status === 'VALIDATED') {
      // Verify with SSLCommerz validation API
      const isValid = await this.validateTransaction(ipnData.val_id, txn.amount);

      if (isValid) {
        await this.markPaymentSuccess(txn, ipnData);
        return { message: 'Payment validated and recorded' };
      } else {
        await this.markPaymentFailed(txn, 'Validation failed with SSLCommerz');
        return { message: 'Payment validation failed' };
      }
    } else if (ipnData.status === 'FAILED') {
      await this.markPaymentFailed(txn, ipnData.error || 'Payment failed');
      return { message: 'Payment failure recorded' };
    } else if (ipnData.status === 'CANCELLED') {
      await this.markPaymentCancelled(txn);
      return { message: 'Payment cancellation recorded' };
    }

    return { message: 'IPN processed' };
  }

  /**
   * Handle success redirect from SSLCommerz (POST).
   * The customer's browser is redirected here after successful payment.
   */
  async handleSuccess(data: Record<string, any>): Promise<{ orderId: number; transactionId: string; status: string }> {
    this.logger.log(`SSLCommerz success callback: tran_id=${data.tran_id}`);

    const tranId = data.tran_id;
    const txn = await this.txnRepo.findOne({ where: { transactionId: tranId } });
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }

    // If IPN already validated, just return success
    if (txn.status === 'validated') {
      return { orderId: txn.orderId, transactionId: tranId, status: 'paid' };
    }

    // Validate payment if val_id present
    if (data.val_id) {
      const isValid = await this.validateTransaction(data.val_id, txn.amount);
      if (isValid) {
        await this.markPaymentSuccess(txn, data);
        return { orderId: txn.orderId, transactionId: tranId, status: 'paid' };
      }
    }

    // Mark as pending validation (IPN will confirm)
    await this.txnRepo.update(txn.id, {
      status: 'pending_validation',
      gatewayResponse: data,
    });

    return { orderId: txn.orderId, transactionId: tranId, status: 'pending_validation' };
  }

  /**
   * Handle fail redirect from SSLCommerz.
   */
  async handleFail(data: Record<string, any>): Promise<{ orderId: number; transactionId: string; status: string }> {
    this.logger.log(`SSLCommerz fail callback: tran_id=${data.tran_id}`);

    const tranId = data.tran_id;
    const txn = await this.txnRepo.findOne({ where: { transactionId: tranId } });
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }

    await this.markPaymentFailed(txn, data.error || 'Payment failed at gateway');
    return { orderId: txn.orderId, transactionId: tranId, status: 'failed' };
  }

  /**
   * Handle cancel redirect from SSLCommerz.
   */
  async handleCancel(data: Record<string, any>): Promise<{ orderId: number; transactionId: string; status: string }> {
    this.logger.log(`SSLCommerz cancel callback: tran_id=${data.tran_id}`);

    const tranId = data.tran_id;
    const txn = await this.txnRepo.findOne({ where: { transactionId: tranId } });
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }

    await this.markPaymentCancelled(txn);
    return { orderId: txn.orderId, transactionId: tranId, status: 'cancelled' };
  }

  /**
   * Get payment status for an order.
   */
  async getPaymentStatus(orderId: number): Promise<{
    paymentStatus: string;
    paymentMethod: string;
    transactionId: string | null;
    paidAmount: number;
    paidAt: Date | null;
    transactions: PaymentTransaction[];
  }> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    const transactions = await this.txnRepo.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    return {
      paymentStatus: order.paymentStatus || 'unpaid',
      paymentMethod: order.paymentMethod || 'cash',
      transactionId: order.paymentTransactionId || null,
      paidAmount: Number(order.paidAmount) || 0,
      paidAt: order.paidAt || null,
      transactions,
    };
  }

  /**
   * Check if a transaction has been validated by querying SSLCommerz Order Validation API.
   */
  async checkTransactionStatus(transactionId: string): Promise<any> {
    const txn = await this.txnRepo.findOne({ where: { transactionId } });
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }

    const postData: Record<string, string> = {
      store_id: this.storeId,
      store_passwd: this.storePassword,
      tran_id: transactionId,
    };

    const response = await this.sslcommerzRequest(
      '/validator/api/merchantTransIDvalidationAPI.php',
      postData,
    );

    return {
      transaction: txn,
      sslcommerzStatus: response,
    };
  }

  /**
   * Initiate a refund through SSLCommerz.
   */
  async initiateRefund(
    transactionId: string,
    refundAmount: number,
    refundRemarks: string,
  ): Promise<any> {
    const txn = await this.txnRepo.findOne({ where: { transactionId } });
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }

    if (txn.status !== 'validated') {
      throw new BadRequestException('Can only refund validated transactions');
    }

    if (!txn.bankTranId) {
      throw new BadRequestException('No bank transaction ID available for refund');
    }

    const postData: Record<string, string> = {
      store_id: this.storeId,
      store_passwd: this.storePassword,
      bank_tran_id: txn.bankTranId,
      refund_amount: String(refundAmount),
      refund_remarks: refundRemarks,
    };

    const refundApiPath = this.isSandbox
      ? '/validator/api/merchantTransIDvalidationAPI.php'
      : '/validator/api/merchantTransIDvalidationAPI.php';

    const response = await this.sslcommerzRequest(refundApiPath, postData);

    // Log refund attempt
    this.logger.log(`Refund initiated for ${transactionId}: ${JSON.stringify(response)}`);

    return response;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  private async validateTransaction(valId: string, expectedAmount: number): Promise<boolean> {
    if (!valId) return false;

    try {
      const postData: Record<string, string> = {
        store_id: this.storeId,
        store_passwd: this.storePassword,
        val_id: valId,
      };

      const response = await this.sslcommerzRequest(
        '/validator/api/validationserverAPI.php',
        postData,
      );

      if (response.status === 'VALID' || response.status === 'VALIDATED') {
        const responseAmount = parseFloat(response.amount || '0');
        const diff = Math.abs(responseAmount - Number(expectedAmount));
        // Allow a small tolerance (1 BDT) for rounding
        if (diff <= 1) {
          return true;
        }
        this.logger.warn(
          `Amount mismatch: expected ${expectedAmount}, got ${responseAmount}`,
        );
      }

      return false;
    } catch (err) {
      this.logger.error(`Validation API error: ${err}`);
      return false;
    }
  }

  private async markPaymentSuccess(txn: PaymentTransaction, data: Record<string, any>): Promise<void> {
    const now = new Date();

    await this.txnRepo.update(txn.id, {
      status: 'validated',
      bankTranId: data.bank_tran_id || null,
      cardType: data.card_type || null,
      cardNo: data.card_no || null,
      cardIssuer: data.card_issuer || null,
      cardBrand: data.card_brand || null,
      cardIssuerCountry: data.card_issuer_country || null,
      storeAmount: data.store_amount ? parseFloat(data.store_amount) : null,
      valId: data.val_id || null,
      validatedAt: now,
      validationStatus: 'VALID',
      gatewayResponse: data,
    });

    await this.orderRepo.update(txn.orderId, {
      paymentStatus: 'paid',
      paidAmount: Number(txn.amount),
      paidAt: now,
    });

    this.logger.log(`Payment validated for order #${txn.orderId}, txn: ${txn.transactionId}`);
  }

  private async markPaymentFailed(txn: PaymentTransaction, errorMessage: string): Promise<void> {
    await this.txnRepo.update(txn.id, {
      status: 'failed',
      errorMessage,
    });

    await this.orderRepo.update(txn.orderId, {
      paymentStatus: 'failed',
    });
  }

  private async markPaymentCancelled(txn: PaymentTransaction): Promise<void> {
    await this.txnRepo.update(txn.id, {
      status: 'cancelled',
    });

    await this.orderRepo.update(txn.orderId, {
      paymentStatus: 'cancelled',
    });
  }

  /**
   * Make an HTTPS request to SSLCommerz API.
   * Uses native Node.js http/https for zero external dependencies.
   */
  private sslcommerzRequest(path: string, postData: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const encodedData = querystring.stringify(postData);
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(encodedData),
        },
      };

      const req = transport.request(options, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer | string) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch {
            this.logger.error(`SSLCommerz response parse error: ${body.substring(0, 500)}`);
            reject(new Error('Invalid response from SSLCommerz'));
          }
        });
      });

      req.on('error', (err: Error) => {
        this.logger.error(`SSLCommerz request error: ${err.message}`);
        reject(err);
      });

      req.write(encodedData);
      req.end();
    });
  }
}
