import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, sendCreated, sendNoContent, NotificationType } from '@ghosttab/common';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { read, type, page, limit } = req.query;

      const result = await notificationService.getUserNotifications(req.user.id, {
        read: read as any,
        type: type as NotificationType,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: page ? (parseInt(page as string, 10) - 1) * (parseInt((limit as string) || '20', 10)) : undefined,
      });

      return sendSuccess(res, {
        notifications: result.notifications,
        total: result.total,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const count = await notificationService.getUnreadCount(req.user.id);

      return sendSuccess(res, { unreadCount: count });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { notificationId } = req.params;
      await notificationService.markAsRead(req.user.id, notificationId);

      return sendSuccess(res, { message: 'Notification marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await notificationService.markAllAsRead(req.user.id);

      return sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { notificationId } = req.params;
      await notificationService.deleteNotification(req.user.id, notificationId);

      return sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async deleteAllNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await notificationService.deleteAllNotifications(req.user.id);

      return sendSuccess(res, { message: 'All notifications deleted' });
    } catch (error) {
      next(error);
    }
  }

  async sendNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.sendNotification(req.body);

      return sendCreated(res, { message: 'Notification sent' });
    } catch (error) {
      next(error);
    }
  }

  async sendBulkNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { notifications } = req.body;
      await notificationService.sendBulkNotifications(notifications);

      return sendCreated(res, { 
        message: 'Notifications sent',
        count: notifications.length 
      });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req: AuthenticatedRequest, res: Response) {
    return sendSuccess(res, {
      status: 'healthy',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
    });
  }
}

export const notificationController = new NotificationController();