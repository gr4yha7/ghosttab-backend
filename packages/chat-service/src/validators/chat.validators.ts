import { z } from 'zod';
import { uuidSchema, paginationSchema } from '@ghosttab/common';

export const tabIdParamSchema = z.object({
  params: z.object({
    tabId: uuidSchema,
  }),
});

export const channelIdParamSchema = z.object({
  params: z.object({
    channelId: z.string().min(1),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    channelId: z.string().min(1),
  }),
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    channelId: z.string().min(1),
  }),
  body: z.object({
    text: z.string().min(1).max(5000),
    attachments: z.array(z.any()).optional(),
  }),
});

export const messageIdParamSchema = z.object({
  params: z.object({
    channelId: z.string().min(1),
    messageId: z.string().min(1),
  }),
});

export const updateMessageSchema = z.object({
  params: z.object({
    messageId: z.string().min(1),
  }),
  body: z.object({
    text: z.string().min(1).max(5000),
  }),
});

export const searchMessagesSchema = z.object({
  params: z.object({
    channelId: z.string().min(1),
  }),
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
  }),
});

export const reactionSchema = z.object({
  params: z.object({
    channelId: z.string().min(1),
    messageId: z.string().min(1),
  }),
  body: z.object({
    reactionType: z.string().min(1).max(50),
  }),
});