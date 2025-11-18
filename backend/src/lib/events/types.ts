export enum DomainEventType {
  // User events
  USER_REGISTERED = 'user.registered',
  USER_LOGGED_IN = 'user.logged_in',

  // Shop events
  SHOP_CREATED = 'shop.created',
  SHOP_UPDATED = 'shop.updated',
  SHOP_STATUS_CHANGED = 'shop.status_changed',

  // Listing events
  LISTING_CREATED = 'listing.created',
  LISTING_UPDATED = 'listing.updated',
  LISTING_STATUS_CHANGED = 'listing.status_changed',
  LISTING_VIEWED = 'listing.viewed',

  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_STATUS_CHANGED = 'order.status_changed',
  ORDER_CANCELLED = 'order.cancelled',

  // Payment events
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',

  // Review events
  REVIEW_CREATED = 'review.created',
  REVIEW_UPDATED = 'review.updated',
  REVIEW_MODERATED = 'review.moderated',

  // Cart events
  CART_ITEM_ADDED = 'cart.item_added',
  CART_ITEM_REMOVED = 'cart.item_removed',
  CART_CLEARED = 'cart.cleared',
}

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  tenantId: string;
  userId?: string;
  data: T;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export interface EventHandler<T = any> {
  handle(event: DomainEvent<T>): Promise<void> | void;
}

// Specific event data types
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  role: string;
}

export interface ShopCreatedEvent {
  shopId: string;
  ownerId: string;
  name: string;
}

export interface ListingCreatedEvent {
  listingId: string;
  shopId: string;
  title: string;
  price: number;
}

export interface OrderCreatedEvent {
  orderId: string;
  buyerId: string;
  totalPrice: number;
  itemCount: number;
}

export interface PaymentSucceededEvent {
  orderId: string;
  paymentIntentId: string;
  amount: number;
}

export interface ReviewCreatedEvent {
  reviewId: string;
  listingId: string;
  userId: string;
  rating: number;
}
