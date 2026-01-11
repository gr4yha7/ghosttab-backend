import { Router } from 'express';
import { validate } from '@ghosttab/common';
import { authenticate } from '../middleware/auth.middleware';
import { analyticsController } from '../controllers/analytics.controller';
import {
  getSpendingSchema,
  getCategoriesSchema,
  getTrendsSchema,
} from '../validators/analytics.validators'

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /analytics/dashboard
 * @desc    Get dashboard analytics with summary metrics
 * @access  Private
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * @route   GET /analytics/spending
 * @desc    Get detailed spending analytics
 * @access  Private
 * @query   period - week|month|quarter|year|all
 * @query   groupBy - day|week|month
 * @query   category - optional category filter
 */
router.get('/spending', validate(getSpendingSchema), analyticsController.getSpending);

/**
 * @route   GET /analytics/payment-behavior
 * @desc    Get payment behavior and trust score analytics
 * @access  Private
 */
router.get('/payment-behavior', analyticsController.getPaymentBehavior);

/**
 * @route   GET /analytics/social
 * @desc    Get social insights and collaboration analytics
 * @access  Private
 */
router.get('/social', analyticsController.getSocial);

/**
 * @route   GET /analytics/categories
 * @desc    Get category-specific analytics
 * @access  Private
 * @query   period - week|month|quarter|year|all
 */
router.get('/categories', validate(getCategoriesSchema), analyticsController.getCategories);

/**
 * @route   GET /analytics/trends
 * @desc    Get trend analytics for specific metrics
 * @access  Private
 * @query   metric - spending|tabs|trust_score
 * @query   period - week|month|quarter|year
 */
router.get('/trends', validate(getTrendsSchema), analyticsController.getTrends);

export default router;
