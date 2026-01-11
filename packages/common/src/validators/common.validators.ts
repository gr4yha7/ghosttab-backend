import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const uuidSchema = z.string().refine(
  (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val) || val.startsWith('did:privy:'),
  {
    message: 'Invalid ID format (must be UUID or Privy DID)',
  }
);

export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid wallet address');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const otpCodeSchema = z
  .string()
  .length(6, 'OTP code must be 6 digits')
  .regex(/^\d{6}$/, 'OTP code must contain only digits');

export const decimalAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format')
  .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0');

export const txHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

export const notificationTypeSchema = z.enum(['FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'TAB_CREATED',
  'TAB_UPDATED',
  'PAYMENT_RECEIVED',
  'PAYMENT_REMINDER',
  'TAB_SETTLED',
  'MESSAGE_RECEIVED'])