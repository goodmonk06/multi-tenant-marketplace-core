/**
 * Adapter Layer
 *
 * This module provides extensibility points for integrating with external services.
 * Each adapter defines an interface and provides a stub implementation.
 *
 * To integrate a real service:
 * 1. Implement the adapter interface (e.g., INotificationAdapter)
 * 2. Replace the exported singleton with your implementation
 * 3. Configure the service credentials via environment variables
 *
 * Example:
 * ```typescript
 * import { INotificationAdapter } from './notification.adapter';
 * import { SendGridNotificationAdapter } from './sendgrid.adapter';
 *
 * export const notificationAdapter: INotificationAdapter =
 *   new SendGridNotificationAdapter(process.env.SENDGRID_API_KEY);
 * ```
 */

export * from './notification.adapter';
export * from './payment.adapter';
export * from './storage.adapter';
export * from './analytics.adapter';
