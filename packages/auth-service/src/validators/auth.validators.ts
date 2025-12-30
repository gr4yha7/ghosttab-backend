import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    privyToken: z.string().min(1, 'Privy token is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
});