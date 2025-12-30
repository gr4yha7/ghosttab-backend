import { Router } from 'express';
import { validate } from '@ghosttab/common';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotificationsSchema,
  notificationIdParamSchema,
  sendNotificationSchema,
  sendBulkNotificationSchema,
} from '../validators/notification.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', validate(getNotificationsSchema), notificationController.getNotifications);

/**
 * @route   GET /notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   PATCH /notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch(
  '/:notificationId/read',
  validate(notificationIdParamSchema),
  notificationController.markAsRead
);

/**
 * @route   PATCH /notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @route   DELETE /notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete(
  '/:notificationId',
  validate(notificationIdParamSchema),
  notificationController.deleteNotification
);

/**
 * @route   DELETE /notifications
 * @desc    Delete all notifications
 * @access  Private
 */
router.delete('/', notificationController.deleteAllNotifications);

/**
 * @route   POST /notifications/send
 * @desc    Send a notification (internal use)
 * @access  Private
 */
router.post(
  '/send',
  validate(sendNotificationSchema),
  notificationController.sendNotification
);

/**
 * @route   POST /notifications/send-bulk
 * @desc    Send bulk notifications (internal use)
 * @access  Private
 */
router.post(
  '/send-bulk',
  validate(sendBulkNotificationSchema),
  notificationController.sendBulkNotifications
);

/**
 * @route   GET /notifications/health
 * @desc    Health check
 * @access  Public
 */
router.get('/health', notificationController.healthCheck);

export default router;