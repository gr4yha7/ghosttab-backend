export interface DashboardAnalytics {
  summary: {
    totalSpent: number;
    totalOwed: number;
    activeTabs: number;
    settledTabs: number;
    trustScore: number;
    onTimePaymentRate: number;
  };
  recentActivity: {
    last7Days: {
      tabsCreated: number;
      tabsSettled: number;
      amountSpent: number;
    };
    last30Days: {
      tabsCreated: number;
      tabsSettled: number;
      amountSpent: number;
    };
  };
  topCategories: Array<{
    category: string;
    count: number;
    totalAmount: number;
    percentage: number;
  }>;
  upcomingDeadlines: Array<{
    tabId: string;
    title: string;
    amount: number;
    deadline: string;
    daysRemaining: number;
  }>;
}

export interface SpendingAnalytics {
  totalSpent: number;
  totalOwed: number;
  netBalance: number;
  byCategory: Array<{
    category: string;
    spent: number;
    owed: number;
    count: number;
  }>;
  timeline: Array<{
    date: string;
    spent: number;
    owed: number;
    count: number;
  }>;
  averages: {
    perTab: number;
    perDay: number;
    perMonth: number;
  };
}

export interface PaymentBehaviorAnalytics {
  trustScore: {
    current: number;
    trend: 'up' | 'down' | 'stable';
    history: Array<{
      date: string;
      score: number;
    }>;
  };
  paymentStats: {
    totalSettlements: number;
    onTimePayments: number;
    latePayments: number;
    onTimeRate: number;
    averageSettlementDays: number;
    earlyPayments: number;
  };
  penalties: {
    totalPenalties: number;
    totalPenaltyAmount: number;
    averagePenalty: number;
  };
  streaks: {
    currentOnTimeStreak: number;
    longestOnTimeStreak: number;
  };
}

export interface SocialInsights {
  topCollaborators: Array<{
    userId: string;
    username: string;
    tabCount: number;
    totalAmount: number;
    lastTabDate: string;
  }>;
  friendStats: {
    totalFriends: number;
    activeFriends: number;
    averageTabsPerFriend: number;
  };
  categoryPreferences: {
    yourTop: Array<{ category: string; count: number }>;
    friendsTop: Array<{ category: string; count: number }>;
  };
}

export interface CategoryAnalytics {
  categories: Array<{
    category: string;
    tabCount: number;
    totalSpent: number;
    totalOwed: number;
    averageAmount: number;
    trend: {
      direction: 'up' | 'down' | 'stable';
      percentage: number;
    };
  }>;
  insights: {
    mostExpensive: { category: string; avgAmount: number };
    mostFrequent: { category: string; count: number };
  };
}

export interface TrendAnalytics {
  current: {
    value: number;
    period: string;
  };
  previous: {
    value: number;
    period: string;
  };
  change: {
    absolute: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
  timeline: Array<{
    date: string;
    value: number;
  }>;
}

export interface AnalyticsOptions {
  period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  groupBy?: 'day' | 'week' | 'month';
  category?: string;
  startDate?: Date;
  endDate?: Date;
}

export type TimePeriod = 'week' | 'month' | 'quarter' | 'year';
export type TrendMetric = 'spending' | 'tabs' | 'trust_score';
