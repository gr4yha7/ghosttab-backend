import { z } from 'zod';

export const getSpendingSchema = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional(),
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

export const getCategoriesSchema = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional(),
  }),
});

export const getTrendsSchema = z.object({
  query: z.object({
    metric: z.enum(['spending', 'tabs', 'trust_score']).optional(),
    period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  }),
});