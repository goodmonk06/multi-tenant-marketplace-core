import { logger } from '../logger';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
}

export interface NotificationPayload {
  subject?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Interface for notification adapters (email, SMS, push, etc.)
 * Implementations can integrate with SendGrid, Twilio, Firebase, etc.
 */
export interface INotificationAdapter {
  /**
   * Send a notification to a recipient
   */
  send(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    tenantId: string,
  ): Promise<NotificationResult>;

  /**
   * Send bulk notifications to multiple recipients
   */
  sendBulk(
    channel: NotificationChannel,
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
    tenantId: string,
  ): Promise<NotificationResult[]>;

  /**
   * Verify if a notification channel is configured
   */
  isChannelEnabled(channel: NotificationChannel): boolean;
}

/**
 * In-memory stub implementation for development/testing
 */
export class InMemoryNotificationAdapter implements INotificationAdapter {
  private sentNotifications: Array<{
    channel: NotificationChannel;
    recipient: NotificationRecipient;
    payload: NotificationPayload;
    tenantId: string;
    timestamp: Date;
  }> = [];

  async send(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    tenantId: string,
  ): Promise<NotificationResult> {
    logger.info('Notification sent (in-memory)', {
      channel,
      recipientUserId: recipient.userId,
      title: payload.title,
      tenantId,
    });

    this.sentNotifications.push({
      channel,
      recipient,
      payload,
      tenantId,
      timestamp: new Date(),
    });

    return {
      success: true,
      messageId: `mock-msg-${Date.now()}`,
    };
  }

  async sendBulk(
    channel: NotificationChannel,
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
    tenantId: string,
  ): Promise<NotificationResult[]> {
    const results = await Promise.all(
      recipients.map((recipient) =>
        this.send(channel, recipient, payload, tenantId),
      ),
    );

    return results;
  }

  isChannelEnabled(channel: NotificationChannel): boolean {
    // All channels enabled in stub implementation
    return true;
  }

  // Helper for testing
  getSentNotifications() {
    return this.sentNotifications;
  }

  clear() {
    this.sentNotifications = [];
  }
}

// Export singleton instance
export const notificationAdapter: INotificationAdapter =
  new InMemoryNotificationAdapter();
