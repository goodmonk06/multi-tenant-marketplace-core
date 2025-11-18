import { logger } from '../logger';

export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  LISTING_VIEW = 'listing_view',
  SEARCH = 'search',
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  CHECKOUT_START = 'checkout_start',
  PURCHASE = 'purchase',
  SIGN_UP = 'sign_up',
  LOGIN = 'login',
  CUSTOM = 'custom',
}

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface AnalyticsUser {
  userId: string;
  email?: string;
  name?: string;
  traits?: Record<string, any>;
}

export interface AnalyticsProvider {
  GOOGLE_ANALYTICS = 'google_analytics';
  SEGMENT = 'segment';
  MIXPANEL = 'mixpanel';
  AMPLITUDE = 'amplitude';
  CUSTOM = 'custom';
}

/**
 * Interface for analytics adapters
 * Supports Google Analytics, Segment, Mixpanel, Amplitude, etc.
 */
export interface IAnalyticsAdapter {
  /**
   * Track an analytics event
   */
  track(
    event: AnalyticsEvent,
    tenantId: string,
  ): Promise<void>;

  /**
   * Identify a user with traits
   */
  identify(
    user: AnalyticsUser,
    tenantId: string,
  ): Promise<void>;

  /**
   * Track a page view
   */
  pageView(
    url: string,
    userId?: string,
    properties?: Record<string, any>,
    tenantId?: string,
  ): Promise<void>;

  /**
   * Flush any buffered events (useful for batch processing)
   */
  flush(): Promise<void>;
}

/**
 * In-memory stub implementation for development/testing
 */
export class InMemoryAnalyticsAdapter implements IAnalyticsAdapter {
  private events: Array<{
    event: AnalyticsEvent;
    tenantId: string;
    timestamp: Date;
  }> = [];

  private users: Map<string, {
    user: AnalyticsUser;
    tenantId: string;
    identifiedAt: Date;
  }> = new Map();

  async track(
    event: AnalyticsEvent,
    tenantId: string,
  ): Promise<void> {
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
    };

    this.events.push({
      event: enrichedEvent,
      tenantId,
      timestamp: new Date(),
    });

    logger.debug('Analytics event tracked (in-memory)', {
      eventType: event.eventType,
      userId: event.userId,
      tenantId,
    });
  }

  async identify(
    user: AnalyticsUser,
    tenantId: string,
  ): Promise<void> {
    this.users.set(user.userId, {
      user,
      tenantId,
      identifiedAt: new Date(),
    });

    logger.debug('User identified (in-memory)', {
      userId: user.userId,
      email: user.email,
      tenantId,
    });
  }

  async pageView(
    url: string,
    userId?: string,
    properties?: Record<string, any>,
    tenantId?: string,
  ): Promise<void> {
    await this.track(
      {
        eventType: AnalyticsEventType.PAGE_VIEW,
        userId,
        properties: {
          ...properties,
          url,
        },
      },
      tenantId || 'default',
    );
  }

  async flush(): Promise<void> {
    logger.debug('Analytics events flushed (in-memory)', {
      eventCount: this.events.length,
    });
    // In a real implementation, this would send batched events
  }

  // Helper methods for testing
  getTrackedEvents() {
    return this.events;
  }

  getIdentifiedUsers() {
    return Array.from(this.users.values());
  }

  clear() {
    this.events = [];
    this.users.clear();
  }
}

// Export singleton instance
export const analyticsAdapter: IAnalyticsAdapter = new InMemoryAnalyticsAdapter();
