import { z } from 'zod';
import { emailSchema, uuidSchema, paginationSchema } from '@ghosttab/common';

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(2).max(50).optional(),
    email: emailSchema.optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

export const updateAutoSettleSchema = z.object({
  body: z.object({
    autoSettle: z.boolean(),
    vaultAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    ...paginationSchema.shape,
  }),
});

export const sendFriendRequestSchema = z.object({
  body: z.object({
    toIdentifier: z.string().min(1, 'User identifier is required'),
  }),
});

export const friendshipIdParamSchema = z.object({
  params: z.object({
    friendshipId: uuidSchema,
  }),
});

export const friendIdParamSchema = z.object({
  params: z.object({
    friendId: uuidSchema,
  }),
});

export const getFriendsSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'ACCEPTED', 'BLOCKED']).optional(),
    ...paginationSchema.shape,
  }),
});