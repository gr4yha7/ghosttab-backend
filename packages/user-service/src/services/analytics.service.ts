import { supabase, logger } from '@ghosttab/common';
import Decimal from 'decimal.js';
import {
  DashboardAnalytics,
  SpendingAnalytics,
  PaymentBehaviorAnalytics,
  SocialInsights,
  CategoryAnalytics,
  TrendAnalytics,
  AnalyticsOptions,
  TimePeriod,
  TrendMetric,
} from '../types/analytics.types';

export class AnalyticsService {
  /**
   * Get dashboard analytics with summary metrics
   */
  async getDashboard(userId: string): Promise<DashboardAnalytics> {
    const [summary, recentActivity, topCategories, upcomingDeadlines] = await Promise.all([
      this.getSummaryMetrics(userId),
      this.getRecentActivity(userId),
      this.getTopCategories(userId, 5),
      this.getUpcomingDeadlines(userId, 5),
    ]);

    return {
      summary,
      recentActivity,
      topCategories,
      upcomingDeadlines,
    };
  }

  /**
   * Get spending analytics
   */
  async getSpendingAnalytics(
    userId: string,
    options: AnalyticsOptions = {}
  ): Promise<SpendingAnalytics> {
    const { startDate, endDate } = this.getDateRange(options.period || 'month');

    const [totals, byCategory, timeline] = await Promise.all([
      this.getSpendingTotals(userId, startDate, endDate),
      this.getSpendingByCategory(userId, startDate, endDate),
      this.getSpendingTimeline(userId, startDate, endDate, options.groupBy || 'day'),
    ]);

    const tabCount = byCategory.reduce((sum, cat) => sum + cat.count, 0);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ...totals,
      byCategory,
      timeline,
      averages: {
        perTab: tabCount > 0 ? totals.totalSpent / tabCount : 0,
        perDay: days > 0 ? totals.totalSpent / days : 0,
        perMonth: totals.totalSpent / Math.max(1, days / 30),
      },
    };
  }

  /**
   * Get payment behavior analytics
   */
  async getPaymentBehavior(userId: string): Promise<PaymentBehaviorAnalytics> {
    const [trustScore, paymentStats, penalties, streaks] = await Promise.all([
      this.getTrustScoreData(userId),
      this.getPaymentStats(userId),
      this.getPenaltyStats(userId),
      this.getPaymentStreaks(userId),
    ]);

    return {
      trustScore,
      paymentStats,
      penalties,
      streaks,
    };
  }

  /**
   * Get social insights
   */
  async getSocialInsights(userId: string): Promise<SocialInsights> {
    const [topCollaborators, friendStats, categoryPreferences] = await Promise.all([
      this.getTopCollaborators(userId, 10),
      this.getFriendStats(userId),
      this.getCategoryPreferences(userId),
    ]);

    return {
      topCollaborators,
      friendStats,
      categoryPreferences,
    };
  }

  /**
   * Get category analytics
   */
  async getCategoryAnalytics(
    userId: string,
    options: AnalyticsOptions = {}
  ): Promise<CategoryAnalytics> {
    const { startDate, endDate } = this.getDateRange(options.period || 'month');
    const categories = await this.getDetailedCategoryStats(userId, startDate, endDate);

    const mostExpensive = categories.reduce((max, cat) =>
      cat.averageAmount > max.avgAmount ? { category: cat.category, avgAmount: cat.averageAmount } : max,
      { category: '', avgAmount: 0 }
    );

    const mostFrequent = categories.reduce((max, cat) =>
      cat.tabCount > max.count ? { category: cat.category, count: cat.tabCount } : max,
      { category: '', count: 0 }
    );

    return {
      categories,
      insights: {
        mostExpensive,
        mostFrequent,
      },
    };
  }

  /**
   * Get trend analytics
   */
  async getTrends(
    userId: string,
    metric: TrendMetric,
    period: TimePeriod
  ): Promise<TrendAnalytics> {
    const { startDate, endDate } = this.getDateRange(period);
    const previousRange = this.getPreviousDateRange(period);

    const [currentValue, previousValue, timeline] = await Promise.all([
      this.getMetricValue(userId, metric, startDate, endDate),
      this.getMetricValue(userId, metric, previousRange.startDate, previousRange.endDate),
      this.getMetricTimeline(userId, metric, startDate, endDate),
    ]);

    const change = this.calculateChange(currentValue, previousValue);

    return {
      current: {
        value: currentValue,
        period: this.formatPeriod(startDate, endDate),
      },
      previous: {
        value: previousValue,
        period: this.formatPeriod(previousRange.startDate, previousRange.endDate),
      },
      change,
      timeline,
    };
  }

  // ============ Private Helper Methods ============

  private async getSummaryMetrics(userId: string) {
    const { data: user } = await supabase
      .from('users')
      .select('trust_score, settlements_on_time, total_settlements')
      .eq('id', userId)
      .single();

    // 1. Total Owed to You: Sum of unpaid shares of others in tabs you created
    const { data: owedData } = await supabase
      .from('tab_participants')
      .select('share_amount, tab:tab_id!inner(creator_id, status)')
      .eq('tab.creator_id', userId)
      .eq('tab.status', 'OPEN')
      .neq('user_id', userId)
      .eq('paid', false);

    const totalOwed = owedData?.reduce((sum, p) => sum + Number(p.share_amount), 0) || 0;

    // 2. Total You Owe: Sum of your own unpaid shares in any tab
    const { data: owingData } = await supabase
      .from('tab_participants')
      .select('share_amount, tab:tab_id!inner(status)')
      .eq('user_id', userId)
      .eq('tab.status', 'OPEN')
      .eq('paid', false);

    const totalOwing = owingData?.reduce((sum, p) => sum + Number(p.share_amount), 0) || 0;

    // 3. Status counts
    const { data: tabs } = await supabase
      .from('tabs')
      .select('id, status')
      .or(`creator_id.eq.${userId},participants.user_id.eq.${userId}`);

    const activeTabs = tabs?.filter(t => t.status === 'OPEN').length || 0;
    const settledTabs = tabs?.filter(t => t.status === 'SETTLED').length || 0;

    const onTimeRate = (user?.total_settlements || 0) >
      0 ? ((user?.settlements_on_time || 0) / (user?.total_settlements || 1)) * 100
      : 100;

    return {
      totalSpent: totalOwing, // Repurposing totalSpent as "Currently Owing" for the Dashboard summary
      totalOwed,
      activeTabs,
      settledTabs,
      trustScore: user?.trust_score || 100,
      onTimePaymentRate: onTimeRate,
    };
  }

  private async getRecentActivity(userId: string) {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const getActivity = async (since: Date) => {
      const { data: tabs } = await supabase
        .from('tabs')
        .select('id, status, created_at')
        .or(`creator_id.eq.${userId},participants.user_id.eq.${userId}`)
        .gte('created_at', since.toISOString());

      const { data: participants } = await supabase
        .from('tab_participants')
        .select('share_amount, paid, paid_at')
        .eq('user_id', userId)
        .gte('paid_at', since.toISOString())
        .eq('paid', true);

      return {
        tabsCreated: tabs?.filter(t => (t.created_at || '') >= since.toISOString()).length || 0,
        tabsSettled: participants?.length || 0,
        amountSpent: participants?.reduce((sum, p) => sum + Number(p.share_amount), 0) || 0,
      };
    };

    const [last7DaysData, last30DaysData] = await Promise.all([
      getActivity(last7Days),
      getActivity(last30Days),
    ]);

    return {
      last7Days: last7DaysData,
      last30Days: last30DaysData,
    };
  }

  private async getTopCategories(userId: string, limit: number) {
    const { data } = await supabase
      .from('tabs')
      .select('category, total_amount')
      .or(`creator_id.eq.${userId},participants.user_id.eq.${userId}`);

    const categoryMap = new Map<string, { count: number; total: number }>();

    data?.forEach(tab => {
      const cat = tab.category || 'OTHER';
      const existing = categoryMap.get(cat) || { count: 0, total: 0 };
      categoryMap.set(cat, {
        count: existing.count + 1,
        total: existing.total + Number(tab.total_amount),
      });
    });

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.total, 0);

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        totalAmount: data.total,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
  }

  private async getUpcomingDeadlines(userId: string, limit: number) {
    const { data: participants } = await supabase
      .from('tab_participants')
      .select(`
        tab:tab_id (
          id,
          title,
          settlement_deadline
        ),
        share_amount
      `)
      .eq('user_id', userId)
      .eq('paid', false)
      .not('tab.settlement_deadline', 'is', null)
      .gte('tab.settlement_deadline', new Date().toISOString())
      .order('tab.settlement_deadline', { ascending: true })
      .limit(limit);

    return (participants || []).map((p: any) => {
      const deadline = new Date(p.tab.settlement_deadline);
      const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        tabId: p.tab.id,
        title: p.tab.title,
        amount: Number(p.share_amount),
        deadline: p.tab.settlement_deadline,
        daysRemaining,
      };
    });
  }

  private async getSpendingTotals(userId: string, startDate: Date, endDate: Date) {
    const { data: participants } = await supabase
      .from('tab_participants')
      .select('share_amount, paid, tab:tab_id(created_at)')
      .eq('user_id', userId)
      .gte('tab.created_at', startDate.toISOString())
      .lte('tab.created_at', endDate.toISOString());

    const { data: createdTabs } = await supabase
      .from('tabs')
      .select('total_amount, status')
      .eq('creator_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalSpent = participants?.reduce((sum, p) => sum + Number(p.share_amount), 0) || 0;
    const totalOwed = createdTabs?.filter(t => t.status === 'OPEN')
      .reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    return {
      totalSpent,
      totalOwed,
      netBalance: totalOwed - totalSpent,
    };
  }

  private async getSpendingByCategory(userId: string, startDate: Date, endDate: Date) {
    // Note: Using direct query instead of RPC function for better type safety
    const { data } = await supabase
      .from('tabs')
      .select(`
        category,
        total_amount,
        creator_id,
        participants:tab_participants(user_id, share_amount)
      `)
      .or(`creator_id.eq.${userId},participants.user_id.eq.${userId}`)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const categoryMap = new Map<string, { spent: number; owed: number; count: number }>();

    data?.forEach((tab: any) => {
      const cat = tab.category || 'OTHER';
      const existing = categoryMap.get(cat) || { spent: 0, owed: 0, count: 0 };

      const spent = tab.participants?.find((p: any) => p.user_id === userId)?.share_amount || 0;
      const owed = tab.creator_id === userId ? tab.total_amount : 0;

      categoryMap.set(cat, {
        spent: existing.spent + Number(spent),
        owed: existing.owed + Number(owed),
        count: existing.count + 1,
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      spent: data.spent,
      owed: data.owed,
      count: data.count,
    }));
  }

  private async getSpendingTimeline(
    userId: string,
    startDate: Date,
    endDate: Date,
    groupBy: string
  ) {
    // Simplified timeline - group by day
    const { data: participants } = await supabase
      .from('tab_participants')
      .select('share_amount, tab:tab_id(created_at)')
      .eq('user_id', userId)
      .gte('tab.created_at', startDate.toISOString())
      .lte('tab.created_at', endDate.toISOString());

    const timelineMap = new Map<string, { spent: number; count: number }>();

    participants?.forEach((p: any) => {
      const date = new Date(p.tab.created_at || new Date()).toISOString().split('T')[0];
      const existing = timelineMap.get(date) || { spent: 0, count: 0 };
      timelineMap.set(date, {
        spent: existing.spent + Number(p.share_amount),
        count: existing.count + 1,
      });
    });

    return Array.from(timelineMap.entries())
      .map(([date, data]) => ({
        date,
        spent: data.spent,
        owed: 0, // Simplified
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getTrustScoreData(userId: string) {
    const { data: user } = await supabase
      .from('users')
      .select('trust_score')
      .eq('id', userId)
      .single();

    const { data: history } = await supabase
      .from('settlement_history')
      .select('created_at, trust_score_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    const current = user?.trust_score || 100;
    const previous = (history && history.length > 1 && history[1].trust_score_after) ? history[1].trust_score_after : current;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (current > previous) trend = 'up';
    else if (current < previous) trend = 'down';

    return {
      current,
      trend,
      history: (history || []).map(h => ({
        date: h.created_at || new Date().toISOString(),
        score: h.trust_score_after || 100,
      })),
    };
  }

  private async getPaymentStats(userId: string) {
    const { data } = await supabase
      .from('tab_participants')
      .select('settled_early, days_late')
      .eq('user_id', userId)
      .eq('paid', true);

    const totalSettlements = data?.length || 0;
    const onTimePayments = data?.filter(p => p.days_late === 0).length || 0;
    const latePayments = data?.filter(p => (p.days_late ?? 0) > 0).length || 0;
    const earlyPayments = data?.filter(p => p.settled_early).length || 0;
    const avgDays = (data?.reduce((sum, p) => sum + (p.days_late ?? 0), 0) || 0) / Math.max(1, totalSettlements);

    return {
      totalSettlements,
      onTimePayments,
      latePayments,
      onTimeRate: totalSettlements > 0 ? (onTimePayments / totalSettlements) * 100 : 100,
      averageSettlementDays: avgDays,
      earlyPayments,
    };
  }

  private async getPenaltyStats(userId: string) {
    const { data } = await supabase
      .from('tab_participants')
      .select('penalty_amount')
      .eq('user_id', userId)
      .gt('penalty_amount', 0);

    const totalPenalties = data?.length || 0;
    const totalAmount = data?.reduce((sum, p) => sum + Number(p.penalty_amount), 0) || 0;

    return {
      totalPenalties,
      totalPenaltyAmount: totalAmount,
      averagePenalty: totalPenalties > 0 ? totalAmount / totalPenalties : 0,
    };
  }

  private async getPaymentStreaks(userId: string) {
    const { data } = await supabase
      .from('tab_participants')
      .select('days_late, paid_at')
      .eq('user_id', userId)
      .eq('paid', true)
      .order('paid_at', { ascending: false });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    data?.forEach((p, index) => {
      if ((p.days_late || 0) === 0) {
        tempStreak++;
        if (index === 0) currentStreak = tempStreak;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    return {
      currentOnTimeStreak: currentStreak,
      longestOnTimeStreak: longestStreak,
    };
  }

  private async getTopCollaborators(userId: string, limit: number) {
    // This would need a more complex query - simplified version
    const { data: tabs } = await supabase
      .from('tabs')
      .select(`
        creator_id,
        participants:tab_participants(user_id, share_amount)
      `)
      .or(`creator_id.eq.${userId},participants.user_id.eq.${userId}`);

    const collaboratorMap = new Map<string, { count: number; total: number; lastDate: string }>();

    tabs?.forEach((tab: any) => {
      let otherUserId: string | undefined;

      if (tab.creator_id === userId) {
        // Current user is creator, collaborator is the first OTHER participant
        otherUserId = tab.participants?.find((p: any) => p.user_id !== userId)?.user_id;
      } else {
        // Current user is participant, collaborator is likely the creator
        otherUserId = tab.creator_id;
      }

      if (otherUserId && otherUserId !== userId) {
        const existing = collaboratorMap.get(otherUserId) || { count: 0, total: 0, lastDate: '' };
        collaboratorMap.set(otherUserId, {
          count: existing.count + 1,
          total: existing.total + (tab.participants?.find((p: any) => p.user_id === otherUserId)?.share_amount || 0),
          lastDate: new Date().toISOString(), // Simplified
        });
      }
    });

    return Array.from(collaboratorMap.entries())
      .map(([userId, data]) => ({
        userId,
        username: 'User', // TODO: Would need to fetch
        tabCount: data.count,
        totalAmount: data.total,
        lastTabDate: data.lastDate,
      }))
      .sort((a, b) => b.tabCount - a.tabCount)
      .slice(0, limit);
  }

  private async getFriendStats(userId: string) {
    const { data: friends } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'ACCEPTED');

    return {
      totalFriends: friends?.length || 0,
      activeFriends: 0, // Would need more complex query
      averageTabsPerFriend: 0, // Would need more complex query
    };
  }

  private async getCategoryPreferences(userId: string) {
    const { data } = await supabase
      .from('tabs')
      .select('category')
      .eq('creator_id', userId);

    const categoryCount = new Map<string, number>();
    data?.forEach(tab => {
      const cat = tab.category || 'OTHER';
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
    });

    const yourTop = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      yourTop,
      friendsTop: [], // Would need more complex query
    };
  }

  private async getDetailedCategoryStats(userId: string, startDate: Date, endDate: Date) {
    const { data } = await supabase
      .from('tabs')
      .select('category, total_amount, created_at')
      .or(`creator_id.eq.${userId},participants.user_id.eq.${userId}`)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const categoryMap = new Map<string, { count: number; total: number }>();

    data?.forEach(tab => {
      const cat = tab.category || 'OTHER';
      const existing = categoryMap.get(cat) || { count: 0, total: 0 };
      categoryMap.set(cat, {
        count: existing.count + 1,
        total: existing.total + Number(tab.total_amount),
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      tabCount: data.count,
      totalSpent: data.total,
      totalOwed: data.total, // Re-mapped for better clarity
      averageAmount: data.count > 0 ? data.total / data.count : 0,
      trend: {
        direction: 'stable' as const,
        percentage: 0,
      },
    }));
  }

  private async getMetricValue(
    userId: string,
    metric: TrendMetric,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    if (metric === 'spending') {
      const { data } = await supabase
        .from('tab_participants')
        .select('share_amount')
        .eq('user_id', userId)
        .gte('paid_at', startDate.toISOString())
        .lte('paid_at', endDate.toISOString())
        .eq('paid', true);

      return data?.reduce((sum, p) => sum + Number(p.share_amount), 0) || 0;
    }

    if (metric === 'tabs') {
      const { data } = await supabase
        .from('tabs')
        .select('id')
        .eq('creator_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      return data?.length || 0;
    }

    // trust_score
    const { data: user } = await supabase
      .from('users')
      .select('trust_score')
      .eq('id', userId)
      .single();

    return user?.trust_score || 100;
  }

  private async getMetricTimeline(
    userId: string,
    metric: TrendMetric,
    startDate: Date,
    endDate: Date
  ) {
    // Simplified - would need more complex implementation
    return [
      { date: startDate.toISOString().split('T')[0], value: 0 },
      { date: endDate.toISOString().split('T')[0], value: 0 },
    ];
  }

  private getDateRange(period: string = 'month'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2020); // Arbitrary start date
        break;
    }

    return { startDate, endDate };
  }

  private getPreviousDateRange(period: TimePeriod): { startDate: Date; endDate: Date } {
    const current = this.getDateRange(period);
    const duration = current.endDate.getTime() - current.startDate.getTime();

    return {
      endDate: new Date(current.startDate.getTime()),
      startDate: new Date(current.startDate.getTime() - duration),
    };
  }

  private calculateChange(current: number, previous: number) {
    const absolute = current - previous;
    const percentage = previous > 0 ? (absolute / previous) * 100 : 0;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(percentage) > 5) {
      direction = percentage > 0 ? 'up' : 'down';
    }

    return {
      absolute,
      percentage,
      direction,
    };
  }

  private formatPeriod(startDate: Date, endDate: Date): string {
    return `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
  }
}

export const analyticsService = new AnalyticsService();
