import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess } from '@ghosttab/common';
import { analyticsService } from '../services/analytics.service';
import { AnalyticsOptions, TimePeriod, TrendMetric } from '../types/analytics.types';

export class AnalyticsController {
  /**
   * GET /analytics/dashboard
   */
  async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const analytics = await analyticsService.getDashboard(req.user.id);
      return sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /analytics/spending
   */
  async getSpending(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const options: AnalyticsOptions = {
        period: req.query.period as AnalyticsOptions['period'] || 'month',
        groupBy: req.query.groupBy as AnalyticsOptions['groupBy'] || 'day',
        category: req.query.category as string,
      };

      const analytics = await analyticsService.getSpendingAnalytics(req.user.id, options);
      return sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /analytics/payment-behavior
   */
  async getPaymentBehavior(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const analytics = await analyticsService.getPaymentBehavior(req.user.id);
      return sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /analytics/social
   */
  async getSocial(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const analytics = await analyticsService.getSocialInsights(req.user.id);
      return sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /analytics/categories
   */
  async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const options: AnalyticsOptions = {
        period: req.query.period as AnalyticsOptions['period'] || 'month',
      };

      const analytics = await analyticsService.getCategoryAnalytics(req.user.id, options);
      return sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /analytics/trends
   */
  async getTrends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const metric = req.query.metric as TrendMetric || 'spending';
      const period = req.query.period as TimePeriod || 'month';

      const analytics = await analyticsService.getTrends(req.user.id, metric, period);
      return sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
