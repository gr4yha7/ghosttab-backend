import { z } from 'zod';
import { uuidSchema, paginationSchema } from '@ghosttab/common';

export const getNotificationsSchema = z.object({
  query: z.object({
    read: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
    type: z.string().optional(),
    ...paginationSchema.shape,
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    notificationId: uuidSchema,
  }),
});

export const sendNotificationSchema = z.object({
  body: z.object({
    userId: uuidSchema,
    type: z.string().min(1),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(1000),
    data: z.any().optional(),
  }),
});

export const sendBulkNotificationSchema = z.object({
  body: z.object({
    notifications: z.array(
      z.object({
        userId: uuidSchema,
        type: z.string().min(1),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(1000),
        data: z.any().optional(),
      })
    ).min(1).max(100),
  }),
});