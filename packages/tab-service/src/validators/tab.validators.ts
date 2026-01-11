import { z } from 'zod';
import { uuidSchema, decimalAmountSchema, txHashSchema, paginationSchema, walletAddressSchema } from '@ghosttab/common';

export const createTabSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    category: z.enum([
      "DINING",
      "TRAVEL",
      "GROCERIES",
      "ENTERTAINMENT",
      "UTILITIES",
      "GIFTS",
      "TRANSPORTATION",
      "ACCOMMODATION",
      "OTHER"]
    ).optional(),
    totalAmount: decimalAmountSchema,
    currency: z.string().default('USDC'),
    participants: z.array(
      z.object({
        userId: uuidSchema,
        shareAmount: decimalAmountSchema.optional(),
      })
    ).min(1, 'At least one participant is required'),
    settlementWallet: walletAddressSchema.optional(),
    settlementDeadline: z.coerce.date()
      .refine((date) => {
        const now = Date.now();
        const oneDay = now + 24 * 60 * 60 * 1000;
        const thirtyDays = now + 30 * 24 * 60 * 60 * 1000;
        return date >= new Date(oneDay) && date <= new Date(thirtyDays);
      }, "Settlement deadline must be between 1 and 30 days from now")
      .optional(),
    penaltyRate: z.number().default(0).optional(),
    autoSettle: z.boolean().default(false).optional(),
  }),
});

export const createGroupTabSchema = z.object({
  params: z.object({
    groupId: uuidSchema,
  }),
  // body: createTabSchema.shape.body.omit({participants: true}),
  body: z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    category: z.enum([
      "DINING",
      "TRAVEL",
      "GROCERIES",
      "ENTERTAINMENT",
      "UTILITIES",
      "GIFTS",
      "TRANSPORTATION",
      "ACCOMMODATION",
      "OTHER"]
    ).optional(),
    totalAmount: decimalAmountSchema,
    currency: z.string().default('USDC'),
    settlementWallet: walletAddressSchema.optional(),
    settlementDeadline: z.coerce.date()
      .refine((date) => {
        const now = Date.now();
        const oneDay = now + 24 * 60 * 60 * 1000;
        const thirtyDays = now + 30 * 24 * 60 * 60 * 1000;
        return date >= new Date(oneDay) && date <= new Date(thirtyDays);
      }, "Settlement deadline must be between 1 and 30 days from now")
      .optional(),
    penaltyRate: z.number().default(0).optional(),
    autoSettle: z.boolean().default(false).optional(),
  }),
})

export const updateTabSchema = z.object({
  params: z.object({
    tabId: uuidSchema,
  }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    category: z.enum([
      "DINING",
      "TRAVEL",
      "GROCERIES",
      "ENTERTAINMENT",
      "UTILITIES",
      "GIFTS",
      "TRANSPORTATION",
      "ACCOMMODATION",
      "OTHER"]
    ).optional(),
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

export const verifyTabParticipationSchema = z.object({
  params: z.object({
    tabId: uuidSchema,
  }),
  body: z.object({
    otpCode: z.string().length(6),
    accept: z.boolean(),
  }),
});

export const getUserTabsSchema = z.object({
  query: z.object({
    status: z.enum(['OPEN', 'SETTLED', 'CANCELLED']).optional(),
    ...paginationSchema.shape,
  }),
});

export const generateHashSchema = z.object({
  body: z.object({
    sender: walletAddressSchema,
    amount: z.number().positive(),
  }),
});

export const submitTransactionSchema = z.object({
  body: z.object({
    rawTxnHex: z.string().min(1),
    publicKey: z.string().min(1),
    signature: z.string().min(1),
  }),
});

export const getWalletBalanceSchema = z.object({
  params: z.object({
    address: walletAddressSchema,
  }),
});