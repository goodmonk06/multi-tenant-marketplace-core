import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';
import { ListingsService } from '../listings/listings.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
    private listingsService: ListingsService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      console.warn('STRIPE_SECRET_KEY not configured. Payment functionality will be limited.');
    }
    this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
      apiVersion: '2024-12-18.acacia',
    });
  }

  async createPaymentIntent(orderId: string, tenantId: string) {
    const order = await this.ordersService.findById(orderId, tenantId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.paymentIntentId) {
      throw new BadRequestException('Order already has a payment intent');
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: order.totalPrice,
      currency: order.currency,
      metadata: {
        orderId: order.id,
        tenantId: order.tenantId,
        buyerId: order.buyerId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update order with payment intent
    await this.ordersService.updatePayment(
      orderId,
      paymentIntent.id,
      OrderStatus.PAYMENT_PENDING,
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const order = await this.ordersService.findByPaymentIntent(
      paymentIntent.id,
    );

    if (!order) {
      console.error(`Order not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Update order status
    await this.ordersService.updateStatus(
      order.id,
      order.tenantId,
      OrderStatus.PAYMENT_SUCCEEDED,
    );

    // Decrement stock for all items
    for (const item of order.items) {
      await this.listingsService.decrementStock(item.listingId, item.quantity);
    }

    console.log(`Payment succeeded for order: ${order.id}`);
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    const order = await this.ordersService.findByPaymentIntent(
      paymentIntent.id,
    );

    if (!order) {
      console.error(`Order not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Update order status
    await this.ordersService.updateStatus(
      order.id,
      order.tenantId,
      OrderStatus.PAYMENT_FAILED,
    );

    console.log(`Payment failed for order: ${order.id}`);
  }
}
