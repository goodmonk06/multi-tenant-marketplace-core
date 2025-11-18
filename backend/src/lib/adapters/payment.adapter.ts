import { logger } from '../logger';

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  CUSTOM = 'custom',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface PaymentIntent {
  id: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  customerId?: string;
  metadata?: Record<string, any>;
  clientSecret?: string;
  createdAt: Date;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
}

export interface RefundParams {
  paymentIntentId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
}

export interface PaymentCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for payment provider adapters
 * Allows switching between Stripe, PayPal, Square, etc.
 */
export interface IPaymentAdapter {
  /**
   * Create a payment intent
   */
  createPaymentIntent(
    params: CreatePaymentIntentParams,
    tenantId: string,
  ): Promise<PaymentIntent>;

  /**
   * Retrieve payment intent details
   */
  getPaymentIntent(
    paymentIntentId: string,
    tenantId: string,
  ): Promise<PaymentIntent>;

  /**
   * Confirm a payment intent (for certain flows)
   */
  confirmPaymentIntent(
    paymentIntentId: string,
    tenantId: string,
  ): Promise<PaymentIntent>;

  /**
   * Cancel a payment intent
   */
  cancelPaymentIntent(
    paymentIntentId: string,
    tenantId: string,
  ): Promise<PaymentIntent>;

  /**
   * Process a refund
   */
  refund(params: RefundParams, tenantId: string): Promise<{
    id: string;
    status: PaymentStatus;
    amount: number;
  }>;

  /**
   * Create or retrieve a customer
   */
  createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, any>,
  ): Promise<PaymentCustomer>;

  /**
   * Get the provider name
   */
  getProvider(): PaymentProvider;
}

/**
 * In-memory stub implementation for development/testing
 */
export class InMemoryPaymentAdapter implements IPaymentAdapter {
  private paymentIntents: Map<string, PaymentIntent> = new Map();
  private customers: Map<string, PaymentCustomer> = new Map();
  private intentCounter = 1000;
  private customerCounter = 2000;

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
    tenantId: string,
  ): Promise<PaymentIntent> {
    const id = `pi_mock_${this.intentCounter++}`;

    const intent: PaymentIntent = {
      id,
      provider: PaymentProvider.CUSTOM,
      amount: params.amount,
      currency: params.currency,
      status: PaymentStatus.PENDING,
      customerId: params.customerId,
      metadata: params.metadata,
      clientSecret: `${id}_secret_${Date.now()}`,
      createdAt: new Date(),
    };

    this.paymentIntents.set(id, intent);

    logger.info('Payment intent created (in-memory)', {
      paymentIntentId: id,
      amount: params.amount,
      currency: params.currency,
      tenantId,
    });

    return intent;
  }

  async getPaymentIntent(
    paymentIntentId: string,
    tenantId: string,
  ): Promise<PaymentIntent> {
    const intent = this.paymentIntents.get(paymentIntentId);

    if (!intent) {
      throw new Error(`Payment intent not found: ${paymentIntentId}`);
    }

    return intent;
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    tenantId: string,
  ): Promise<PaymentIntent> {
    const intent = await this.getPaymentIntent(paymentIntentId, tenantId);
    intent.status = PaymentStatus.SUCCEEDED;

    logger.info('Payment intent confirmed (in-memory)', {
      paymentIntentId,
      tenantId,
    });

    return intent;
  }

  async cancelPaymentIntent(
    paymentIntentId: string,
    tenantId: string,
  ): Promise<PaymentIntent> {
    const intent = await this.getPaymentIntent(paymentIntentId, tenantId);
    intent.status = PaymentStatus.CANCELLED;

    logger.info('Payment intent cancelled (in-memory)', {
      paymentIntentId,
      tenantId,
    });

    return intent;
  }

  async refund(
    params: RefundParams,
    tenantId: string,
  ): Promise<{ id: string; status: PaymentStatus; amount: number }> {
    const intent = await this.getPaymentIntent(params.paymentIntentId, tenantId);

    if (intent.status !== PaymentStatus.SUCCEEDED) {
      throw new Error(
        `Cannot refund payment with status: ${intent.status}`,
      );
    }

    const refundAmount = params.amount || intent.amount;
    intent.status = PaymentStatus.REFUNDED;

    logger.info('Refund processed (in-memory)', {
      paymentIntentId: params.paymentIntentId,
      refundAmount,
      tenantId,
    });

    return {
      id: `re_mock_${Date.now()}`,
      status: PaymentStatus.REFUNDED,
      amount: refundAmount,
    };
  }

  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, any>,
  ): Promise<PaymentCustomer> {
    const id = `cus_mock_${this.customerCounter++}`;

    const customer: PaymentCustomer = {
      id,
      email,
      name,
      metadata,
    };

    this.customers.set(id, customer);

    logger.info('Payment customer created (in-memory)', { customerId: id, email });

    return customer;
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.CUSTOM;
  }

  // Helper for testing
  clear() {
    this.paymentIntents.clear();
    this.customers.clear();
  }
}

// Export singleton instance
export const paymentAdapter: IPaymentAdapter = new InMemoryPaymentAdapter();
