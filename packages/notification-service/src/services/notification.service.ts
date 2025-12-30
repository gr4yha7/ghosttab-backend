import { supabase, logger, publishNotification, NotificationType } from '@ghosttab/common';

export class NotificationService {
  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    filters: {
      read?: boolean;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ notifications: any[]; total: number }> {
    const { read, type, limit = 20, offset = 0 } = filters;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (read !== undefined) {
      query = query.eq('read', read);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch notifications', { userId, error });
      return { notifications: [], total: 0 };
    }

    return {
      notifications: data || [],
      total: count || 0,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to mark notification as read', { notificationId, error });
      throw new Error('Failed to update notification');
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.error('Failed to mark all notifications as read', { userId, error });
      throw new Error('Failed to update notifications');
    }

    logger.info('All notifications marked as read', { userId });
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to delete notification', { notificationId, error });
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to delete all notifications', { userId, error });
      throw new Error('Failed to delete notifications');
    }

    logger.info('All notifications deleted', { userId });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.error('Failed to get unread count', { userId, error });
      return 0;
    }

    return count || 0;
  }

  /**
   * Send notification (stores in DB and publishes to Redis)
   */
  async sendNotification(notification: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    const { userId, type, title, body, data } = notification;

    // Store in database
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      data,
      read: false,
    });

    if (error) {
      logger.error('Failed to store notification', { userId, error });
      throw new Error('Failed to send notification');
    }

    // Publish to Redis for real-time delivery
    await publishNotification(userId, {
      type,
      title,
      body,
      data,
      userId,
    });

    logger.info('Notification sent', { userId, type });
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }>): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    // Store in database
    const { error } = await supabase
      .from('notifications')
      .insert(
        notifications.map((n) => ({
          user_id: n.userId,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          read: false,
        }))
      );

    if (error) {
      logger.error('Failed to store bulk notifications', { count: notifications.length, error });
      throw new Error('Failed to send notifications');
    }

    // Publish to Redis
    await Promise.all(
      notifications.map((n) =>
        publishNotification(n.userId, {
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          userId: n.userId,
        })
      )
    );

    logger.info('Bulk notifications sent', { count: notifications.length });
  }
}

export const notificationService = new NotificationService();