import { DomainEvent, DomainEventType, EventHandler } from './types';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

export class EventBus {
  private handlers: Map<DomainEventType, EventHandler[]> = new Map();
  private enabled: boolean = true;

  subscribe(eventType: DomainEventType, handler: EventHandler) {
    const existing = this.handlers.get(eventType) || [];
    this.handlers.set(eventType, [...existing, handler]);

    logger.debug('Event handler subscribed', {
      eventType,
      handlerCount: existing.length + 1,
    });
  }

  unsubscribe(eventType: DomainEventType, handler: EventHandler) {
    const existing = this.handlers.get(eventType) || [];
    const filtered = existing.filter((h) => h !== handler);

    if (filtered.length > 0) {
      this.handlers.set(eventType, filtered);
    } else {
      this.handlers.delete(eventType);
    }

    logger.debug('Event handler unsubscribed', {
      eventType,
      handlerCount: filtered.length,
    });
  }

  async publish<T = any>(
    type: DomainEventType,
    tenantId: string,
    data: T,
    options?: {
      userId?: string;
      metadata?: any;
    },
  ): Promise<void> {
    if (!this.enabled) return;

    const event: DomainEvent<T> = {
      id: uuidv4(),
      type,
      tenantId,
      userId: options?.userId,
      data,
      metadata: options?.metadata,
      timestamp: new Date(),
    };

    logger.info('Domain event published', {
      eventId: event.id,
      eventType: event.type,
      tenantId: event.tenantId,
    });

    const handlers = this.handlers.get(type) || [];

    if (handlers.length === 0) {
      logger.warn('No handlers registered for event type', {
        eventType: type,
      });
      return;
    }

    // Execute all handlers concurrently
    const promises = handlers.map(async (handler) => {
      try {
        await handler.handle(event);
        logger.debug('Event handler completed', {
          eventId: event.id,
          eventType: event.type,
        });
      } catch (error) {
        logger.error('Event handler failed', error as Error, {
          eventId: event.id,
          eventType: event.type,
        });
        // Don't throw - we don't want one handler failure to stop others
      }
    });

    await Promise.all(promises);
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }

  clear() {
    this.handlers.clear();
  }

  getHandlerCount(eventType: DomainEventType): number {
    return (this.handlers.get(eventType) || []).length;
  }
}

// Export singleton instance
export const eventBus = new EventBus();
