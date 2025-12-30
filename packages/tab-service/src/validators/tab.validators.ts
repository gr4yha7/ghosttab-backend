import { z } from 'zod';
import { uuidSchema, decimalAmountSchema, txHashSchema, paginationSchema } from '@ghosttab/common';

export const createTabSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    icon: z.string().max(10).optional(),
    totalAmount: decimalAmountSchema,
    currency: z.string().default('MOVE'),
    participants: z.array(
      z.object({
        userId: uuidSchema,
        shareAmount: decimalAmountSchema.optional(),
      })
    ).min(1, 'At least one participant is required'),
  }),
});

export const updateTabSchema = z.object({
  params: z.object({
    tabId: uuidSchema,
  }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().max(10).optional(),
  }),
});

export const settlePaymentSchema = z.object({
  params: z.object({
    tabId: uuidSchema,
  }),
  body: z.object({
    txHash: txHashSchema,
    amount: decimalAmountSchema,
  }),
});

export const tabIdParamSchema = z.object({
  params: z.object({
    tabId: uuidSchema,
  }),
});

export const getUserTabsSchema = z.object({
  query: z.object({
    status: z.enum(['OPEN', 'SETTLED', 'CANCELLED']).optional(),
    ...paginationSchema.shape,
  }),
});