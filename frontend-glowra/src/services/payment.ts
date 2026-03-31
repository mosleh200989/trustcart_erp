import apiClient from './api';

export interface InitiatePaymentParams {
  orderId: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  gatewayUrl: string;
  transactionId: string;
}

export interface PaymentStatusResponse {
  paymentStatus: string;
  paymentMethod: string;
  transactionId: string | null;
  paidAmount: number;
  paidAt: string | null;
  transactions: Array<{
    id: number;
    orderId: number;
    transactionId: string;
    gateway: string;
    amount: number;
    currency: string;
    status: string;
    bankTranId: string | null;
    cardType: string | null;
    cardBrand: string | null;
    storeAmount: number | null;
    validatedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

/**
 * Initiate SSLCommerz payment for an order.
 * Returns the gateway URL to redirect the customer to.
 */
export async function initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResponse> {
  const res = await apiClient.post<InitiatePaymentResponse>('/payments/initiate', params);
  return res.data;
}

/**
 * Redirect the customer to the SSLCommerz gateway page.
 * Call this after initiatePayment returns successfully.
 */
export function redirectToPaymentGateway(gatewayUrl: string): void {
  window.location.href = gatewayUrl;
}

/**
 * Get payment status for an order.
 */
export async function getPaymentStatus(orderId: number): Promise<PaymentStatusResponse> {
  const res = await apiClient.get<PaymentStatusResponse>(`/payments/status/${orderId}`);
  return res.data;
}

/**
 * Check/verify a specific transaction with SSLCommerz.
 */
export async function checkTransaction(transactionId: string): Promise<any> {
  const res = await apiClient.get(`/payments/check/${transactionId}`);
  return res.data;
}

/**
 * Initiate a refund for a transaction.
 */
export async function initiateRefund(
  transactionId: string,
  refundAmount: number,
  refundRemarks: string,
): Promise<any> {
  const res = await apiClient.post('/payments/refund', {
    transactionId,
    refundAmount,
    refundRemarks,
  });
  return res.data;
}
