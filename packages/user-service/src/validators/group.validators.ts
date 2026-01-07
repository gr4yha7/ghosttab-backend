import { z } from 'zod';
import { uuidSchema, paginationSchema } from '@ghosttab/common';

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    description: z.string().min(2).max(100).optional(),
    icon: z.string().min(2).max(50).optional(),
    initialMembers: z.array(uuidSchema).max(10).optional(),
  }),
});

export const updateGroupSchema = z.object({
  params: z.object({
    groupId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    description: z.string().min(2).max(100).optional(),
    icon: z.string().min(2).max(50).optional(),
  }),
});

export const addMembersSchema = z.object({
  params: z.object({
    groupId: uuidSchema,
  }),
  body: z.object({
    memberIds: z.array(uuidSchema)
  }),
});

export const groupIdParamSchema = z.object({
  params: z.object({
    groupId: uuidSchema,
  }),
});

export const groupIdParamMemberIdParamSchema = z.object({
  params: z.object({
    groupId: uuidSchema,
    memberId: uuidSchema,
  }),
});

export const getUserGroupsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    ...paginationSchema.shape,
  }),
});

export const getGroupTabsSchema = z.object({
  query: z.object({
    status: z.enum(['OPEN', 'SETTLED', 'CANCELLED']).optional(),
    ...paginationSchema.shape,
  }),
});